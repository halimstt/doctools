import React, { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { setTheme } from '../utils';

const Navbar = () => {
    const handleThemeChange = (e) => {
        setTheme(e.target.value);
    };

    const themes = [
        "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter", "dim", "nord", "sunset"
    ];

    return (
        <div className="navbar bg-base-100 shadow-sm z-50 relative">
            <div className="flex-1">
                <Link to="/" className="btn btn-ghost text-xl text-primary">Doctools</Link>
            </div>
            <div className="flex-none gap-2">
                <ul className="menu menu-horizontal px-1">
                    <li><NavLink to="/statement" className={({ isActive }) => isActive ? "active" : ""}>Statement</NavLink></li>
                    <li><NavLink to="/invoice" className={({ isActive }) => isActive ? "active" : ""}>Invoice</NavLink></li>
                </ul>
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost">
                        Theme
                        <svg width="12px" height="12px" className="h-2 w-2 fill-current opacity-60 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048"><path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path></svg>
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[1] p-2 shadow-2xl bg-base-300 rounded-box w-52 max-h-96 overflow-y-auto">
                        {themes.map((theme) => (
                            <li key={theme}>
                                <input
                                    type="radio"
                                    name="theme-dropdown"
                                    className="theme-controller btn btn-sm btn-block btn-ghost justify-start normal-case"
                                    aria-label={theme.charAt(0).toUpperCase() + theme.slice(1)}
                                    value={theme}
                                    onChange={handleThemeChange}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
