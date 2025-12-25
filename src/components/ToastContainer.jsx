import React from 'react';

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast z-[9999]">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`alert cursor-pointer ${toast.type === 'error'
                            ? 'alert-error'
                            : toast.type === 'success'
                                ? 'alert-success'
                                : toast.type === 'warning'
                                    ? 'alert-warning'
                                    : 'alert-info'
                        }`}
                    onClick={() => removeToast(toast.id)}
                >
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
