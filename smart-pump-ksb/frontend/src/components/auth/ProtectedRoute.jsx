import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { getCurrentUser, getMe } from '../../services/auth';

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const localUser = getCurrentUser();

        if (localUser) {
          setAllowed(true);
          return;
        }

        await getMe();

        if (active) {
          setAllowed(true);
        }
      } catch {
        if (active) {
          setAllowed(false);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
        Checking session...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}