import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getPDFLib, filterPdfFiles, downloadCSV, removeElementAtIndex, getMonthYear, parseDateForSorting } from '../utils';
import {
    peekDatesFromPdf,
    extractTextLinesFromPdfMaybankPdf,
    parseTransactionsMaybankPdf,
    getHighAccuracyTextFromPdfMaybankWeb,
    parseTextAndGenerateCsvMaybankWeb,
} from '../parsers';
import SplitPaneLayout from '../components/SplitPaneLayout';
import FileUpload from '../components/FileUpload';
import ResultSection from '../components/ResultSection';
import DateSelectionModal from '../components/DateSelectionModal';

const Statement = () => {
    const { showToast } = useOutletContext();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [parserType, setParserType] = useState('maybank-pdf');
    const [statusText, setStatusText] = useState('');

    // Modal State
    const [dateModalOpen, setDateModalOpen] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);

    const processFiles = (files) => {
        const pdfFiles = filterPdfFiles(files);
        if (pdfFiles.length === 0) {
            showToast('error', 'Please select valid PDF file(s).');
            return;
        }

        // Filter duplicates
        const newFiles = pdfFiles.filter(newFile =>
            !selectedFiles.some(existing =>
                existing.name === newFile.name && existing.size === newFile.size
            )
        );

        setSelectedFiles(prev => [...prev, ...newFiles]);
    };

    const handleRemoveFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveAll = () => {
        setSelectedFiles([]);
        setTransactions([]);
        setStatusText('');
    };

    const handleProcess = async () => {
        if (selectedFiles.length === 0) return;

        setProcessing(true);
        setTransactions([]);
        setStatusText('Analyzing files for sorting...');

        try {
            const pdfjsLib = await getPDFLib();
            const filesWithDateInfo = [];

            // Step 1: Peek dates and sort
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setStatusText(`Analyzing dates in ${file.name} (${i + 1}/${selectedFiles.length})...`);

                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
                    const { earliestDate, latestDate } = await peekDatesFromPdf(pdf);

                    filesWithDateInfo.push({
                        file,
                        pdf,
                        earliestDate,
                        latestDate,
                        originalIndex: i
                    });
                } catch (peekingError) {
                    console.warn(`Could not peek dates for ${file.name}:`, peekingError);
                    // Still add to list so it gets processed, just without date info
                    filesWithDateInfo.push({
                        file,
                        pdf: null, // We'll have to reload it in Step 2 or handle null
                        earliestDate: null,
                        latestDate: null,
                        originalIndex: i
                    });
                }
            }

            // Sort files
            filesWithDateInfo.sort((a, b) => {
                if (a.latestDate === null && b.latestDate === null) return a.originalIndex - b.originalIndex;
                if (a.latestDate === null) return 1;
                if (b.latestDate === null) return -1;
                const latestDiff = b.latestDate - a.latestDate;
                if (latestDiff !== 0) return latestDiff;
                return a.originalIndex - b.originalIndex;
            });

            let allTrans = [];

            // Step 2: Extract transactions
            for (let i = 0; i < filesWithDateInfo.length; i++) {
                const { file, pdf: existingPdf } = filesWithDateInfo[i];
                setStatusText(`Processing ${file.name} (${i + 1}/${filesWithDateInfo.length})...`);

                let fileTransactions = [];
                try {
                    let pdf = existingPdf;
                    if (!pdf) {
                        const arrayBuffer = await file.arrayBuffer();
                        pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
                    }

                    switch (parserType) {
                        case 'maybank-pdf':
                            const allLines = await extractTextLinesFromPdfMaybankPdf(pdf);
                            fileTransactions = parseTransactionsMaybankPdf(allLines);
                            break;
                        case 'maybank-web':
                            const text = await getHighAccuracyTextFromPdfMaybankWeb(pdf);
                            fileTransactions = parseTextAndGenerateCsvMaybankWeb(text);
                            break;
                        default:
                            throw new Error(`Unsupported parser type: ${parserType}`);
                    }
                } catch (extractError) {
                    console.error(`Error extracting from ${file.name}:`, extractError);
                    showToast('error', `Could not extract from ${file.name}: ${extractError.message}`);
                }

                if (fileTransactions && fileTransactions.length > 0) {
                    allTrans = allTrans.concat(fileTransactions);
                }
            }

            allTrans.sort((a, b) => parseDateForSorting(b.Date) - parseDateForSorting(a.Date));
            setTransactions(allTrans);
            if (allTrans.length > 0) {
                showToast('success', `${selectedFiles.length} file(s) processed. Found ${allTrans.length} transactions.`);
            } else {
                showToast('error', 'No transactions found in the selected file(s). Check if you used the correct Parser Type.');
            }

        } catch (error) {
            console.error('Processing error:', error);
            showToast('error', `Processing failed: ${error.message}`);
        } finally {
            setProcessing(false);
            setStatusText('Complete.');
            setTimeout(() => setStatusText(''), 3000);
        }
    };


    const handleDownload = () => {
        if (transactions.length === 0) return;

        // Grouping: Check if we have multiple months first.
        const monthsSet = new Set();
        const datesSet = new Set();

        transactions.forEach(tx => {
            if (tx.Date) {
                datesSet.add(tx.Date);
                monthsSet.add(getMonthYear(tx.Date));
            }
        });

        const uniqueDates = Array.from(datesSet).sort((a, b) => parseDateForSorting(b) - parseDateForSorting(a));
        const uniqueMonths = Array.from(monthsSet).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateB - dateA;
        });

        if (uniqueDates.length <= 1) {
            handleConfirmDownload(uniqueDates);
            return;
        }

        // If we have multiple months, group by month for a cleaner UI.
        // If we have only 1 month but multiple days, show the days.
        if (uniqueMonths.length > 1) {
            setAvailableDates(uniqueMonths);
        } else {
            setAvailableDates(uniqueDates);
        }

        setDateModalOpen(true);
    };

    const handleConfirmDownload = (selectedLabels) => {
        if (!selectedLabels || selectedLabels.length === 0) return;

        // Filter: check if tx.Date matches exactly OR via month-year label
        const filteredTransactions = transactions.filter(tx => {
            const txDate = tx.Date;
            const txMonthYear = getMonthYear(txDate);
            return selectedLabels.includes(txDate) || selectedLabels.includes(txMonthYear);
        }).sort((a, b) => parseDateForSorting(b.Date) - parseDateForSorting(a.Date));

        downloadCSV(
            filteredTransactions,
            ["Date", "Description", "Amount"],
            `statement_export_${new Date().toISOString().slice(0, 10)}.csv`
        );
        setDateModalOpen(false);
    };

    const leftContent = (
        <>
            <h2 className="text-lg font-bold mb-2 flex-none">Input</h2>
            <div className="flex-grow flex flex-col">
                <div className="mb-4 flex items-center justify-center gap-2 flex-none">
                    <span className="text-xs font-semibold whitespace-nowrap">Parser Type:</span>
                    <select
                        className="select select-sm select-bordered w-auto h-8 min-h-0"
                        value={parserType}
                        onChange={(e) => setParserType(e.target.value)}
                        disabled={processing}
                    >
                        <option value="maybank-pdf">Maybank PDF Statement</option>
                        <option value="maybank-web">Maybank Web Download</option>
                    </select>
                </div>

                <FileUpload
                    files={selectedFiles}
                    onFileChange={(files) => processFiles(files)}
                    onRemoveFile={handleRemoveFile}
                    onRemoveAll={handleRemoveAll}
                    disabled={processing}
                />

                <div className="flex justify-center space-x-2 mb-2 flex-none">
                    <button
                        className="btn btn-primary btn-sm btn-wide h-10 min-h-0 text-base"
                        disabled={selectedFiles.length === 0 || processing}
                        onClick={handleProcess}
                    >
                        {processing ? (
                            <>
                                <span className="loading loading-dots loading-xs"></span>
                            </>
                        ) : 'Process Files'}
                    </button>
                </div>

                <div className="text-center text-xs h-4 flex-none">
                    <p className="opacity-80">{statusText}</p>
                </div>
            </div>
        </>
    );

    const rightContent = (
        <ResultSection
            title="Processed Results"
            onDownload={handleDownload}
            hasResults={transactions.length > 0}
            processing={processing}
        >
            <table className="table table-zebra table-xs md:table-sm w-full sticky top-0">
                <thead className='bg-base-200 sticky top-0 z-10'>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th className='text-right'>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length === 0 ? (
                        <tr>
                            <td colSpan="3" className="text-center py-20 opacity-70">
                                {processing ? 'Processing...' : 'No transactions processed yet.'}
                            </td>
                        </tr>
                    ) : (
                        transactions.map((tx, idx) => (
                            <tr key={idx}>
                                <td className="whitespace-nowrap">{tx.Date}</td>
                                <td>{tx.Description}</td>
                                <td className={`text-right font-mono ${parseFloat(tx.Amount) < 0 ? 'text-error' : 'text-success'}`}>
                                    {tx.Amount}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </ResultSection>
    );

    return (
        <div className="w-full h-full flex flex-col overflow-hidden px-2 sm:px-4">
            <header className="text-center mb-6 flex-none pt-4">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                    Statements Converter
                </h1>
            </header>

            <main className="bg-base-200 rounded-box py-4 px-4 flex-grow flex flex-col overflow-hidden mb-4">
                <SplitPaneLayout
                    leftContent={leftContent}
                    rightContent={rightContent}
                />
            </main>

            <DateSelectionModal
                isOpen={dateModalOpen}
                onClose={() => setDateModalOpen(false)}
                onConfirm={handleConfirmDownload}
                availableDates={availableDates}
            />
        </div>
    );
};

export default Statement;
