import React from 'react';

const ResultSection = ({
    title = "Results",
    onDownload,
    children,
    processing,
    hasResults,
    downloadLabel = "Download CSV"
}) => {
    return (
        <>
            <div className="flex justify-between items-center mb-4 flex-none">
                <h2 className="text-xl font-bold">{title}</h2>
                <button
                    className="btn btn-secondary btn-sm h-9 min-h-0"
                    disabled={!hasResults || processing}
                    onClick={onDownload}
                >
                    {downloadLabel}
                </button>
            </div>

            <div className="flex-grow overflow-x-auto rounded-box border border-base-content/20 bg-base-100 relative">
                <div className="absolute inset-0 overflow-auto">
                    {children}
                </div>
            </div>
        </>
    );
};

export default ResultSection;
