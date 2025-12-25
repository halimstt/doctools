import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getPDFLib, filterPdfFiles, downloadCSV, removeElementAtIndex } from '../utils';
import { extractDataWithRegex, classifyDocumentHeuristically, generateRegexWithAI } from '../parsers';
import ProcessTab from '../components/Invoice/ProcessTab';
import TemplateTab from '../components/Invoice/TemplateTab';

const Invoice = () => {
    const { showToast, openApiKeyModal, openConfirmationModal, geminiApiKey } = useOutletContext();

    // State
    const [activeTab, setActiveTab] = useState('Process');
    const [files, setFiles] = useState([]);
    const [results, setResults] = useState([]);
    const [processing, setProcessing] = useState(false);

    // Template State
    const [localConfigurations, setLocalConfigurations] = useState([]);
    const [activeConfigName, setActiveConfigName] = useState('');

    // Analysis State
    const [currentPdfText, setCurrentPdfText] = useState('');
    const [currentFileName, setCurrentFileName] = useState('');

    // Load configs
    useEffect(() => {
        const stored = localStorage.getItem('invoiceTemplates');
        if (stored) {
            try {
                setLocalConfigurations(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse invoiceTemplates", e);
            }
        }
    }, []);

    const saveConfigs = (newConfigs) => {
        setLocalConfigurations(newConfigs);
        localStorage.setItem('invoiceTemplates', JSON.stringify(newConfigs));
    };

    // Handlers
    const handleFileChange = (newFiles) => {
        const pdfFiles = filterPdfFiles(newFiles);
        if (pdfFiles.length === 0) {
            showToast('error', 'Please select valid PDF files.');
            return;
        }
        // Filter duplicates
        const uniqueFiles = pdfFiles.filter(newFile =>
            !files.some(existing =>
                existing.name === newFile.name && existing.size === newFile.size
            )
        );
        setFiles(prev => [...prev, ...uniqueFiles]);
    };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setProcessing(true);
        setResults([]); // Clear previous results? Or append? Let's clear for now matching old behavior mostly

        try {
            const pdfjsLib = await getPDFLib();
            const newResults = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;

                let fullText = '';
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }

                // Classification
                const { matchedConfigName } = classifyDocumentHeuristically(fullText, localConfigurations);

                let extractedData = {};
                let configUsed = null;

                if (matchedConfigName && matchedConfigName !== 'None') {
                    configUsed = localConfigurations.find(c => c.name === matchedConfigName);
                    if (configUsed) {
                        extractedData = extractDataWithRegex(fullText, configUsed);
                    }
                }

                newResults.push({
                    fileName: file.name,
                    configUsedName: matchedConfigName === 'None' ? null : matchedConfigName,
                    ...extractedData,
                    originalFile: file
                });
            }
            setResults(newResults);
            showToast('success', 'Processing complete!');
        } catch (e) {
            console.error(e);
            showToast('error', 'Error processing files: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAnalyzeRow = async (index) => {
        const result = results[index];
        const file = result.originalFile;

        // Switch tab
        setActiveTab('Template');

        // Load Text
        try {
            const pdfjsLib = await getPDFLib();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
            let fullText = '';
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            setCurrentPdfText(fullText);
            setCurrentFileName(file.name);
        } catch (e) {
            showToast('error', 'Could not load PDF text.');
            return;
        }

        // Set Active Config
        if (result.configUsedName) {
            setActiveConfigName(result.configUsedName);
        } else {
            setActiveConfigName(''); // Or create new?
        }
    };

    const handleSaveConfig = (configData) => {
        if (!configData.name) {
            showToast('error', 'Template Name is required.');
            return;
        }

        const existingIndex = localConfigurations.findIndex(c => c.name === configData.name);

        const save = () => {
            let newConfigs = [...localConfigurations];
            if (existingIndex >= 0) {
                newConfigs[existingIndex] = configData;
            } else {
                newConfigs.push(configData);
            }
            saveConfigs(newConfigs);
            setActiveConfigName(configData.name);
            showToast('success', 'Template saved.');
        };

        if (existingIndex >= 0 && activeConfigName !== configData.name) {
            // If name matches existing but we were editing a different one (or new), ask confirm
            openConfirmationModal({
                title: 'Overwrite Template?',
                message: `Template "${configData.name}" already exists. Overwrite?`,
                confirmText: 'Overwrite',
                onConfirm: save
            });
        } else {
            save();
        }
    };

    const handleDeleteConfig = () => {
        if (!activeConfigName) return;
        openConfirmationModal({
            title: 'Delete Template?',
            message: `Are you sure you want to delete "${activeConfigName}"?`,
            confirmText: 'Delete',
            onConfirm: () => {
                const newConfigs = localConfigurations.filter(c => c.name !== activeConfigName);
                saveConfigs(newConfigs);
                setActiveConfigName('');
                showToast('success', 'Template deleted.');
            }
        });
    };

    // AI Helper
    const handleGenerateRegex = async (field, currentPattern) => {
        if (!currentPdfText) {
            showToast('info', 'Please analyze a document first.');
            return;
        }

        let apiKey = geminiApiKey;
        if (!apiKey) {
            apiKey = await openApiKeyModal();
            if (!apiKey) {
                showToast('error', 'AI Key required.');
                return;
            }
        }

        showToast('info', 'Generating suggestions...');
        try {
            const suggestions = await generateRegexWithAI(currentPdfText, field, currentPattern, apiKey);
            return suggestions;
        } catch (e) {
            showToast('error', 'AI Error: ' + e.message);
            return [];
        }
    };

    const handleDownload = () => {
        // Transform results to flat CSV friendly format
        const headers = ["File Name", "Template", "Supplier", "Date", "Doc #", "Total Amount"];
        const csvData = results.map(r => ({
            "File Name": r.fileName,
            "Template": r.configUsedName || '',
            "Supplier": r.officialSupplierNameForExport || r.extractedSupplierName || '',
            "Date": r.documentDate || '',
            "Doc #": r.documentNumber || '',
            "Total Amount": r.totalAmount || ''
        }));
        downloadCSV(csvData, headers, `invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden px-2 sm:px-4">
            <header className="text-center mb-6 flex-none pt-4">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Invoices Converter</h1>
            </header>

            <div role="tablist" className="tabs tabs-boxed mb-4 justify-center flex-none">
                <a role="tab" className={`tab ${activeTab === 'Process' ? 'tab-active' : ''}`} onClick={() => setActiveTab('Process')}>Extract</a>
                <a role="tab" className={`tab ${activeTab === 'Template' ? 'tab-active' : ''}`} onClick={() => setActiveTab('Template')}>Templates</a>
            </div>

            <main className="flex-grow flex flex-col overflow-hidden mb-4">
                {activeTab === 'Process' && (
                    <ProcessTab
                        files={files}
                        onFileChange={handleFileChange}
                        onRemoveFile={(i) => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        onRemoveAll={() => { setFiles([]); setResults([]); }}
                        onProcess={handleProcess}
                        processing={processing}
                        results={results}
                        onAnalyzeRow={handleAnalyzeRow}
                        onDownload={handleDownload}
                    />
                )}
                {activeTab === 'Template' && (
                    <TemplateTab
                        configs={localConfigurations}
                        activeConfigName={activeConfigName}
                        onConfigChange={setActiveConfigName}
                        onSaveConfig={handleSaveConfig}
                        onDeleteConfig={handleDeleteConfig}
                        currentPdfText={currentPdfText}
                        currentFileName={currentFileName}
                        onGenerateRegex={handleGenerateRegex}
                        onTestRegex={(pattern) => { /* handled in component or here? Component has simple logic */ }}
                        onExportConfigs={() => {
                            const blob = new Blob([JSON.stringify(localConfigurations, null, 2)], { type: 'application/json' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'invoice_templates.json';
                            link.click();
                        }}
                        onImportConfigs={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json';
                            input.onchange = (e) => {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                    try {
                                        const json = JSON.parse(evt.target.result);
                                        // Merge logic? Just append for now
                                        // Check duplicates
                                        const newConfigs = [...localConfigurations];
                                        json.forEach(c => {
                                            if (!newConfigs.some(existing => existing.name === c.name)) {
                                                newConfigs.push(c);
                                            }
                                        });
                                        saveConfigs(newConfigs);
                                        showToast('success', 'Templates imported.');
                                    } catch (err) {
                                        showToast('error', 'Invalid JSON');
                                    }
                                };
                                reader.readAsText(file);
                            };
                            input.click();
                        }}
                    />
                )}
            </main>
        </div>
    );
};

export default Invoice;
