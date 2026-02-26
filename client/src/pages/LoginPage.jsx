/* ──────────────────────────────────────────────────────────────
   src/pages/LoginPage.jsx
   Sign-in form with validation, error display, and redirect.
   ────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../utils/constants';

/* ── Validation helper ───────────────────────────────────────── */
const validate = ({ email, password }) => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    return errs;
};

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

    const [form, setForm] = useState({ email: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        const errs = validate(form);
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }

        setLoading(true);
        try {
            await login({ email: form.email.trim(), password: form.password });
            navigate(from, { replace: true });
        } catch (err) {
            setApiError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page page--auth">
            <div className="auth-card">
                {/* Header */}
                <div className="auth-card__header">
                    <span className="auth-card__icon">🖊️</span>
                    <h1 className="auth-card__title">Welcome back</h1>
                    <p className="auth-card__sub">Sign in to your account</p>
                </div>

                {/* API-level error banner */}
                {apiError && (
                    <div className="alert alert--error" role="alert">
                        {apiError}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                        />
                        {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="login-password"
                                className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
                                type={showPwd ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="input-toggle"
                                onClick={() => setShowPwd(v => !v)}
                                aria-label={showPwd ? 'Hide password' : 'Show password'}
                            >
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
                    </div>

                    {/* Submit */}
                    <button
                        className="btn btn--primary btn--block"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Sign In'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Don't have an account?{' '}
                    <Link to={ROUTES.REGISTER}>Create one</Link>
                </p>
            </div>
        </main>
    );
}

export default LoginPage;
