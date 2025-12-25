import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Home() {
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [showModal, setShowModal] = useState(false);

    // We could implement the API key modal logic here or in a global context/component
    // keeping it simple for now as the original app had it in index.html

    return (
        <div className="container mx-auto p-4 sm:p-8 flex-grow flex flex-col sm:justify-center items-center">
            <header class="text-center mb-8">
                <h1 class="text-4xl sm:text-5xl font-extrabold mb-4 text-primary">
                    Doctools
                </h1>
                <p class="text-lg opacity-80 max-w-2xl mx-auto">
                    Convert PDFs into importable CSV format.
                </p>
            </header>

            <main class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <Link
                    to="/statement"
                    class="card bg-base-100 shadow-xl rounded-box hover:shadow-2xl transform hover:-translate-y-1"
                >
                    <div class="card-body items-center text-center p-8">
                        <h2
                            class="card-title text-2xl sm:text-3xl font-bold text-secondary mb-3"
                        >
                            Statements Converter
                        </h2>
                        <p class="text-base opacity-70">
                            Convert your bank statements into a clean, sortable CSV format.
                            Supports Maybank PDF, Maybank Web, and others (AI-powered).
                        </p>
                    </div>
                </Link>

                <Link
                    to="/invoice"
                    class="card bg-base-100 shadow-xl rounded-box hover:shadow-2xl transform hover:-translate-y-1"
                >
                    <div class="card-body items-center text-center p-8">
                        <h2
                            class="card-title text-2xl sm:text-3xl font-bold text-secondary mb-3"
                        >
                            Invoices Converter
                        </h2>
                        <p class="text-base opacity-70">
                            Simplify your invoice importing process. Convert invoices into
                            importable CSV. Import into accounting apps.
                        </p>
                    </div>
                </Link>
            </main>

            {/* Add modals later or as separate components */}
        </div>
    );
}

export default Home;
