import React, { useRef, useEffect } from 'react';

const ApiKeyModal = ({ isOpen, onClose, onSave, initialKey }) => {
    const dialogRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
            if (inputRef.current) inputRef.current.value = initialKey || '';
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen, initialKey]);

    const handleSave = () => {
        const key = inputRef.current?.value.trim();
        if (key) {
            onSave(key);
        }
    };

    return (
        <dialog ref={dialogRef} className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Enter Gemini API Key</h3>
                <p className="py-4 text-sm opacity-80">
                    To use AI-powered features, please enter your Gemini API key. Your key
                    is stored locally in your browser. You can get one from{' '}
                    <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary"
                    >
                        Google AI Studio
                    </a>
                    .
                </p>
                <input
                    type="password"
                    ref={inputRef}
                    className="input w-full mb-4"
                    placeholder="Your Gemini API Key"
                />
                <div className="modal-action">
                    <button onClick={handleSave} className="btn btn-primary">
                        Save Key
                    </button>
                    <button onClick={onClose} className="btn btn-ghost">
                        Cancel
                    </button>
                </div>
            </div>
        </dialog>
    );
};

export default ApiKeyModal;
