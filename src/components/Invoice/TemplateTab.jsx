import React, { useState } from 'react';

const TemplateTab = ({
    configs,
    activeConfigName,
    onConfigChange,
    onSaveConfig,
    onDeleteConfig,
    currentPdfText,
    currentFileName,
    onGenerateRegex, // AI helper returns Promise<string[]>
    onTestRegex, // Helper to test regex against current text
    onExportConfigs,
    onImportConfigs
}) => {
    const [formData, setFormData] = useState({
        name: '',
        officialSupplierNameForExport: '',
        supplierNamePattern: '',
        documentDatePattern: '',
        documentNumberPattern: '',
        totalAmountPattern: ''
    });

    // Sync formData when activeConfigName changes
    React.useEffect(() => {
        if (activeConfigName) {
            const config = configs.find(c => c.name === activeConfigName);
            if (config) {
                setFormData({ ...config });
            }
        }
    }, [activeConfigName, configs]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSuggest = async (field) => {
        const suggestions = await onGenerateRegex(field, formData[field]);
        if (suggestions && suggestions.length > 0) {
            const chosen = suggestions[0];
            // Simple confirmation
            if (window.confirm(`AI Suggested Regex:\n${chosen}\n\nApply this regex?`)) {
                handleChange(`${field}Pattern`, chosen);
            }
        }
    };

    return (
        <div className="py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Configuration Form */}
                <div>
                    <div className="form-control w-full mb-4">
                        <label className="label"><span className="label-text">Select Template</span></label>
                        <div className="flex gap-2">
                            <select
                                className="select select-bordered flex-grow"
                                value={activeConfigName || ''}
                                onChange={(e) => onConfigChange(e.target.value)}
                            >
                                <option value="">-- New Template --</option>
                                {configs.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                            <button className="btn btn-outline" onClick={onImportConfigs} title="Import JSON">Import</button>
                            <button className="btn btn-outline" onClick={onExportConfigs} title="Export JSON">Export</button>
                        </div>
                    </div>

                    <div className="divider">Template Details</div>

                    <div className="form-control w-full mb-2">
                        <label className="label"><span className="label-text">Template Name</span></label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full h-9 min-h-0"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="e.g. My Supplier Invoice"
                        />
                    </div>

                    <div className="form-control w-full mb-4">
                        <label className="label"><span className="label-text">Official Supplier Name (Export)</span></label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full h-9 min-h-0"
                            value={formData.officialSupplierNameForExport}
                            onChange={(e) => handleChange('officialSupplierNameForExport', e.target.value)}
                            placeholder="e.g. My Supplier Sdn Bhd"
                        />
                    </div>

                    <div className="space-y-3">
                        {['supplierName', 'documentDate', 'documentNumber', 'totalAmount'].map((field) => (
                            <div key={field} className="form-control w-full">
                                <label className="label">
                                    <span className="label-text capitalize">{field.replace(/([A-Z])/g, ' $1').trim()} Regex</span>
                                    <div className="flex gap-2">
                                        <button className="btn btn-xs btn-ghost text-info" onClick={() => onTestRegex(formData[`${field}Pattern`])}>Test</button>
                                        <button className="btn btn-xs btn-ghost text-primary" onClick={() => handleSuggest(field)}>AI Suggest</button>
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full font-mono text-sm h-9 min-h-0"
                                    value={formData[`${field}Pattern`] || ''}
                                    onChange={(e) => handleChange(`${field}Pattern`, e.target.value)}
                                    placeholder={`Regex for ${field}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button className="btn btn-error" disabled={!activeConfigName} onClick={onDeleteConfig}>Delete</button>
                        <button className="btn btn-primary" onClick={() => onSaveConfig(formData)}>Save Template</button>
                    </div>
                </div>

                {/* Right Column: PDF Preview / Text Analysis */}
                <div className="bg-base-200 rounded-box p-4 h-full min-h-[500px] flex flex-col">
                    <h3 className="font-bold mb-2">
                        Document Analysis {currentFileName ? `( ${currentFileName} )` : ''}
                    </h3>
                    {currentPdfText ? (
                        <textarea
                            className="textarea textarea-bordered w-full flex-grow font-mono text-xs leading-relaxed"
                            readOnly
                            value={currentPdfText}
                        ></textarea>
                    ) : (
                        <div className="flex-grow flex items-center justify-center opacity-50 text-center p-4">
                            <p>Load a PDF in the 'Extract' tab and click 'Analyze' on a result row to view its text here.</p>
                        </div>
                    )}
                    <div className="text-xs opacity-70 mt-2 text-center">
                        Use the text above to check regex matches.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateTab;
