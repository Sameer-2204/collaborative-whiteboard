/* ──────────────────────────────────────────────────────────────
   src/pages/RegisterPage.jsx
   Account creation form with validation and auto-login redirect.
   ────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../utils/constants';

/* ── Validation helper ───────────────────────────────────────── */
const validate = ({ name, email, password, confirmPassword }) => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    else if (name.trim().length < 2) errs.name = 'At least 2 characters';

    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';

    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    return errs;
};

/* ── Field component defined OUTSIDE RegisterPage ────────────────
   If defined inside, React treats it as a new component type on
   every render and unmounts/remounts the input, losing focus.    */
const Field = ({ id, label, name, type = 'text', placeholder, autoComplete, value, onChange, error, disabled }) => (
    <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <input
            id={id}
            className={`form-input${error ? ' form-input--error' : ''}`}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
        />
        {error && <span className="form-error">{error}</span>}
    </div>
);

function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        const errs = validate(form);
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }

        setLoading(true);
        try {
            await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
            navigate(ROUTES.DASHBOARD, { replace: true });
        } catch (err) {
            setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                    <h1 className="auth-card__title">Create an account</h1>
                    <p className="auth-card__sub">Start collaborating for free</p>
                </div>

                {/* API error banner */}
                {apiError && (
                    <div className="alert alert--error" role="alert">
                        {apiError}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <Field id="reg-name" label="Full Name" name="name" placeholder="Alice Smith" autoComplete="name"
                        value={form.name} onChange={handleChange} error={fieldErrors.name} disabled={loading} />
                    <Field id="reg-email" label="Email" name="email" placeholder="you@example.com" type="email" autoComplete="email"
                        value={form.email} onChange={handleChange} error={fieldErrors.email} disabled={loading} />

                    {/* Password with show/hide */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="reg-password"
                                className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
                                type={showPwd ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Min 6 characters"
                                autoComplete="new-password"
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

                    {/* Confirm password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <input
                            id="reg-confirm"
                            className={`form-input${fieldErrors.confirmPassword ? ' form-input--error' : ''}`}
                            type={showPwd ? 'text' : 'password'}
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        {fieldErrors.confirmPassword && (
                            <span className="form-error">{fieldErrors.confirmPassword}</span>
                        )}
                    </div>

                    <button
                        className="btn btn--primary btn--block"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Create Account'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Already have an account?{' '}
                    <Link to={ROUTES.LOGIN}>Sign in</Link>
                </p>
            </div>
        </main>
    );
}

export default RegisterPage;
