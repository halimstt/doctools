import React, { useRef, useEffect } from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText }) => {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    return (
        <dialog ref={dialogRef} className="modal">
            <div className="modal-box">
                <h2 className="font-bold text-lg">
                    {title || 'Confirmation'}
                </h2>
                <p className="py-4 text-sm opacity-80">
                    {message || 'Are you sure?'}
                </p>
                <div className="modal-action">
                    <button onClick={onClose} className="btn btn-ghost">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="btn btn-primary">
                        {confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </dialog>
    );
};

export default ConfirmationModal;
