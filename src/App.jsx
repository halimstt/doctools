import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Home from './pages/Home';
import Statement from './pages/Statement';
import Invoice from './pages/Invoice';

function App() {
    return (
        <Router>
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/statement" element={<Statement />} />
                    <Route path="/invoice" element={<Invoice />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
