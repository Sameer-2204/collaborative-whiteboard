/* ──────────────────────────────────────────────────────────────
   src/hooks/useAuth.js
   Re-export of the useAuth hook from AuthContext for convenience.

   Importing from here keeps component imports clean:
     import useAuth from '../hooks/useAuth';
   instead of reaching into context directly.
   ────────────────────────────────────────────────────────────── */

export { useAuth as default } from '../context/AuthContext.jsx';
