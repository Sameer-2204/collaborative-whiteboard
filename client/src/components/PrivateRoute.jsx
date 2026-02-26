/* ──────────────────────────────────────────────────────────────
   src/components/PrivateRoute.jsx
   Route guard – redirects unauthenticated users to /login.

   Used in App.jsx to wrap all protected routes:
     <Route element={<PrivateRoute />}>
       <Route path="/dashboard" element={<DashboardPage />} />
     </Route>

   While auth state is loading (verifying stored token),
   a loading spinner is shown instead of redirecting prematurely.
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function PrivateRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // TODO Phase 2: replace with a styled <Spinner /> component
        return (
            <div className="loading-screen">
                <p>Loading…</p>
            </div>
        );
    }

    // Not authenticated → redirect to /login, preserving the intended path
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Authenticated → render the child route
    return <Outlet />;
}

export default PrivateRoute;
