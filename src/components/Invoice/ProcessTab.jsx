import React from 'react';
import { formatAmountForDisplay, formatDateForDisplay } from '../../utils';
import SplitPaneLayout from '../SplitPaneLayout';
import FileUpload from '../FileUpload';
import ResultSection from '../ResultSection';

const ProcessTab = ({
    files,
    onFileChange,
    onRemoveFile,
    onRemoveAll,
    onProcess,
    onDownload,
    processing,
    results,
    onAnalyzeRow
}) => {

    // Wrapper to match FileUpload onFileChange signature
    const handleFileChange = (fileList) => {
        onFileChange(fileList);
    };

    const leftContent = (
        <>
            <h2 className="text-lg font-bold mb-2 flex-none">Input</h2>
            <div className="flex-grow flex flex-col">
                <FileUpload
                    files={files}
                    onFileChange={handleFileChange}
                    onRemoveFile={onRemoveFile}
                    onRemoveAll={onRemoveAll}
                    disabled={processing}
                />

                <div className="flex justify-center space-x-2 mb-4 flex-none">
                    <button
                        className="btn btn-primary btn-sm btn-wide h-10 min-h-0 text-base"
                        disabled={files.length === 0 || processing}
                        onClick={onProcess}
                    >
                        {processing ? (
                            <>
                                <span className="loading loading-dots loading-xs"></span>
                            </>
                        ) : 'Extract Data'}
                    </button>
                </div>
            </div>
        </>
    );

    const rightContent = (
        <ResultSection
            title="Extracted Results"
            onDownload={onDownload}
            hasResults={results.length > 0}
            processing={processing}
        >
            <table className="table table-zebra table-xs md:table-sm w-full sticky top-0">
                <thead className='bg-base-200 sticky top-0 z-10'>
                    <tr>
                        <th>File Name</th>
                        <th>Template</th>
                        <th>Supplier</th>
                        <th>Date</th>
                        <th>Doc #</th>
                        <th>Total</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {results.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="text-center py-20 opacity-70">
                                {processing ? 'Extracting...' : 'No documents processed yet.'}
                            </td>
                        </tr>
                    ) : (
                        results.map((row, idx) => (
                            <tr key={idx}>
                                <td className="max-w-[100px] truncate" title={row.fileName}>{row.fileName}</td>
                                <td>{row.configUsedName || '-'}</td>
                                <td>{row.officialSupplierNameForExport || row.extractedSupplierName || '-'}</td>
                                <td>{formatDateForDisplay(row.documentDate)}</td>
                                <td>{row.documentNumber || '-'}</td>
                                <td className="font-mono">{formatAmountForDisplay(row.totalAmount)}</td>
                                <td>
                                    <button
                                        className="btn btn-xs btn-info"
                                        onClick={() => onAnalyzeRow(idx)}
                                        title="Analyze & Edit Template"
                                    >
                                        Analyze
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </ResultSection>
    );

    return (
        <div className="py-2 h-full flex flex-col overflow-hidden">
            <SplitPaneLayout
                leftContent={leftContent}
                rightContent={rightContent}
            />
        </div>
    );
};

export default ProcessTab;
