import { useState, type FormEvent } from 'react';

import { login } from './api';
import type { Session } from './types';

type Props = {
    onLogin: (session: Session) => void;
};

export function LoginForm({ onLogin }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const response = await login(username.trim(), password);
            // El backend también lo exige en cada endpoint; esto solo evita
            // dejar entrar a un usuario de empresa a un panel que no puede usar.
            if (!response.platformAdmin) {
                setError('Esta cuenta no es administrador de plataforma.');
                return;
            }
            onLogin({ token: response.token, username: response.username });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="login">
            <h1>ERP · Administración de plataforma</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    Usuario
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                        autoFocus
                    />
                </label>
                <label>
                    Contraseña
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={busy}>
                    {busy ? 'Ingresando…' : 'Ingresar'}
                </button>
            </form>
        </main>
    );
}
