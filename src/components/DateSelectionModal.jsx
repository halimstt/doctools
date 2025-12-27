import React, { useState, useEffect } from 'react';

const DateSelectionModal = ({ isOpen, onClose, onConfirm, availableDates }) => {
    const [selectedDates, setSelectedDates] = useState([]);

    useEffect(() => {
        if (isOpen && availableDates) {
            setSelectedDates([...availableDates]);
        }
    }, [isOpen, availableDates]);

    if (!isOpen) return null;

    const toggleDate = (date) => {
        setSelectedDates(prev =>
            prev.includes(date)
                ? prev.filter(d => d !== date)
                : [...prev, date]
        );
    };

    const handleSelectAll = (select) => {
        if (select) {
            setSelectedDates([...availableDates]);
        } else {
            setSelectedDates([]);
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedDates);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-base-content/10">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Select Export Dates</h3>
                        <button
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={onClose}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex justify-start gap-4 mb-4">
                        <button
                            className="text-primary text-sm font-semibold hover:underline"
                            onClick={() => handleSelectAll(true)}
                        >
                            Select All
                        </button>
                        <button
                            className="text-error text-sm font-semibold hover:underline"
                            onClick={() => handleSelectAll(false)}
                        >
                            Deselect All
                        </button>
                    </div>

                    <div className="bg-base-200/50 rounded-xl border border-base-content/5 max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                        {availableDates && availableDates.length > 0 ? (
                            <div className="grid gap-1">
                                {availableDates.map((date, idx) => (
                                    <label
                                        key={`${date}-${idx}`}
                                        className="flex items-center gap-3 p-3 hover:bg-base-300 rounded-lg cursor-pointer transition-colors group"
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary checkbox-md"
                                            checked={selectedDates.includes(date)}
                                            onChange={() => toggleDate(date)}
                                        />
                                        <span className="font-medium opacity-90 group-hover:opacity-100">
                                            {date}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center opacity-50 italic">
                                No dates found.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            className="btn btn-ghost flex-1 h-12"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary flex-1 h-12"
                            onClick={handleConfirm}
                            disabled={selectedDates.length === 0}
                        >
                            Download CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateSelectionModal;
