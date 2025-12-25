import React, { useRef } from 'react';

const FileUpload = ({
    files,
    onFileChange,
    onRemoveFile,
    onRemoveAll,
    accept = ".pdf",
    disabled = false
}) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            onFileChange(e.target.files);
        }
    };

    return (
        <div className="border-2 border-dashed border-base-content/20 rounded-xl p-4 text-center bg-base-100 min-h-[120px] flex flex-col items-center justify-center mb-4 flex-none">
            <input
                type="file"
                className="hidden"
                accept={accept}
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={disabled}
            />

            {files.length === 0 ? (
                <div
                    onClick={() => !disabled && fileInputRef.current.click()}
                    className={`cursor-pointer flex flex-grow w-full flex-col items-center justify-center py-4 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <svg className="w-8 h-8 opacity-70 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="text-sm font-semibold opacity-80">Upload PDF</p>
                </div>
            ) : (
                <div className="w-full text-left">
                    <p className="font-semibold mb-1 text-xs">Selected Files:</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {files.map((file, index) => (
                            <span key={index} className="badge badge-sm badge-info mr-1 mb-1 items-center">
                                <span className="max-w-[150px] truncate">{file.name}</span>
                                <button
                                    type="button"
                                    className="ml-1 hover:text-white"
                                    onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                                    disabled={disabled}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className='flex gap-2 justify-center mt-2'>
                        <button
                            className="btn btn-sm btn-outline min-h-0 h-8"
                            onClick={() => fileInputRef.current.click()}
                            disabled={disabled}
                        >
                            Add
                        </button>
                        <button
                            className="btn btn-error btn-sm min-h-0 h-8 text-white"
                            onClick={onRemoveAll}
                            disabled={disabled}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
