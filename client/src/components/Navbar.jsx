/* ──────────────────────────────────────────────────────────────
   src/components/Navbar.jsx
   Top navigation bar — shows user name and logout when authed.
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../utils/constants';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate(ROUTES.LOGIN, { replace: true });
    };

    return (
        <nav className="navbar">
            <NavLink to={ROUTES.HOME} className="navbar__brand">
                🖊️ Whiteboard
            </NavLink>

            <ul className="navbar__links">
                {user ? (
                    <>
                        <li>
                            <NavLink to={ROUTES.DASHBOARD}
                                className={({ isActive }) => isActive ? 'active' : ''}>
                                Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <span className="navbar__user">👤 {user.name}</span>
                        </li>
                        <li>
                            <button className="btn btn--outline btn--sm" onClick={handleLogout}>
                                Logout
                            </button>
                        </li>
                    </>
                ) : (
                    <>
                        <li><NavLink to={ROUTES.LOGIN}>Login</NavLink></li>
                        <li>
                            <NavLink to={ROUTES.REGISTER}>
                                <span className="btn btn--primary btn--sm">Register</span>
                            </NavLink>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;
