/* ──────────────────────────────────────────────────────────────
   src/pages/LandingPage.jsx
   Public marketing/hero page shown at route: /

   TODO (Phase 2): add hero section, features grid, CTA buttons.
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

function LandingPage() {
    return (
        <main className="page page--landing">
            <section className="hero">
                <h1 className="hero__title">Real-Time Collaborative Whiteboard</h1>
                <p className="hero__subtitle">
                    Draw, collaborate, and create together — in real time.
                </p>
                <div className="hero__cta">
                    <Link to={ROUTES.REGISTER} className="btn btn--primary">Get Started</Link>
                    <Link to={ROUTES.LOGIN} className="btn btn--outline">Login</Link>
                </div>
            </section>
            {/* TODO Phase 2: Feature highlights section */}
        </main>
    );
}

export default LandingPage;
