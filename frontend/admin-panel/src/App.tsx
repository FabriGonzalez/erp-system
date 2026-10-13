import { useCallback, useState } from 'react';

import { CompaniesPage } from './CompaniesPage';
import { LoginForm } from './LoginForm';
import type { Session } from './types';

// sessionStorage: sobrevive a recargar la pestaña pero no queda guardada al cerrarla.
const SESSION_KEY = 'erp-admin-session';

function readSession(): Session | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
        return null;
    }
}

export default function App() {
    const [session, setSession] = useState<Session | null>(readSession);

    const handleLogin = useCallback((next: Session) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next);
    }, []);

    const handleLogout = useCallback(() => {
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
    }, []);

    return session ? (
        <CompaniesPage session={session} onLogout={handleLogout} />
    ) : (
        <LoginForm onLogin={handleLogin} />
    );
}
