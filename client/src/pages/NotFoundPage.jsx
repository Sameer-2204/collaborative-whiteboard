/* ──────────────────────────────────────────────────────────────
   src/pages/NotFoundPage.jsx
   Displayed for any route that doesn't match — catch-all *
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

function NotFoundPage() {
    return (
        <main className="page page--404">
            <div className="not-found">
                <h1 className="not-found__code">404</h1>
                <p className="not-found__msg">Oops — this page doesn't exist.</p>
                <Link to={ROUTES.HOME} className="btn btn--primary">
                    ← Back to Home
                </Link>
            </div>
        </main>
    );
}

export default NotFoundPage;
