import React, { useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ApiKeyModal from '../components/ApiKeyModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ToastContainer from '../components/ToastContainer';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
    const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [confirmationModalConfig, setConfirmationModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        onConfirm: () => { },
    });
    const [toasts, setToasts] = useState([]);
    const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || '');

    // Helper functions exposed via Outlet context
    const showToast = useCallback((type, message, duration = 5000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const openApiKeyModal = useCallback(() => {
        return new Promise((resolve) => {
            setApiKeyModalOpen(true);
            // We need a way to resolve this promise when modal closes/saves
            // This is a bit tricky with strict declarative React, but we can store the resolver
            window._resolveApiKeyModal = resolve;
        });
    }, []);

    const handleApiKeySave = (key) => {
        localStorage.setItem('geminiApiKey', key);
        setGeminiApiKey(key);
        setApiKeyModalOpen(false);
        if (window._resolveApiKeyModal) {
            window._resolveApiKeyModal(key);
            window._resolveApiKeyModal = null;
        }
        showToast('success', 'API Key saved successfully!');
    };

    const handleApiKeyClose = () => {
        setApiKeyModalOpen(false);
        if (window._resolveApiKeyModal) {
            window._resolveApiKeyModal(null);
            window._resolveApiKeyModal = null;
        }
    };

    const openConfirmationModal = useCallback(({ title, message, confirmText, onConfirm }) => {
        setConfirmationModalConfig({
            isOpen: true,
            title,
            message,
            confirmText,
            onConfirm: () => {
                onConfirm();
                setConfirmationModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    }, []);

    const closeConfirmationModal = () => {
        setConfirmationModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-base-200 text-base-content">
            <Navbar />
            <div className='flex-grow flex flex-col overflow-hidden'>
                <Outlet context={{
                    showToast,
                    openApiKeyModal,
                    openConfirmationModal,
                    geminiApiKey
                }} />
            </div>

            <ApiKeyModal
                isOpen={apiKeyModalOpen}
                onClose={handleApiKeyClose}
                onSave={handleApiKeySave}
                initialKey={geminiApiKey}
            />

            <ConfirmationModal
                isOpen={confirmationModalConfig.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={confirmationModalConfig.onConfirm}
                title={confirmationModalConfig.title}
                message={confirmationModalConfig.message}
                confirmText={confirmationModalConfig.confirmText}
            />

            <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        </div>
    );
};

export default MainLayout;
