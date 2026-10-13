import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, changeCompanyStatus, listCompanies } from './api';
import { NewCompanyForm } from './NewCompanyForm';
import type { Company, CompanyStatus, ProvisionCompanyResponse, Session } from './types';

type Props = {
    session: Session;
    onLogout: () => void;
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
    ACTIVE: 'Activa',
    SUSPENDED: 'Suspendida',
    CANCELLED: 'Cancelada',
};

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

function formatDate(value: string | null): string {
    return value ? dateFormat.format(new Date(value)) : '—';
}

export function CompaniesPage({ session, onLogout }: Props) {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [created, setCreated] = useState<ProvisionCompanyResponse | null>(null);
    // Solo la última carga, y con la página montada, puede escribir la lista.
    const loadIdRef = useRef(0);
    const aliveRef = useRef(false);

    const handleError = useCallback(
        (e: unknown) => {
            if (e instanceof ApiError && e.status === 401) {
                onLogout();
                return;
            }
            setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
        },
        [onLogout]
    );

    const loadCompanies = useCallback(async () => {
        const loadId = ++loadIdRef.current;
        const isCurrent = () => aliveRef.current && loadId === loadIdRef.current;
        setLoading(true);
        try {
            const result = await listCompanies(session.token);
            if (isCurrent()) {
                setCompanies(result);
            }
        } catch (e) {
            if (isCurrent()) {
                handleError(e);
            }
        } finally {
            if (isCurrent()) {
                setLoading(false);
            }
        }
    }, [session.token, handleError]);

    useEffect(() => {
        aliveRef.current = true;
        void loadCompanies();
        // Una carga que termine después del desmontaje (p. ej. logout) se descarta.
        return () => {
            aliveRef.current = false;
        };
    }, [loadCompanies]);

    async function changeStatus(company: Company, status: CompanyStatus) {
        let reason: string | null = null;

        if (status === 'ACTIVE') {
            if (!window.confirm(`¿Reactivar "${company.name}"?`)) return;
        } else {
            const action = status === 'SUSPENDED' ? 'suspender' : 'cancelar';
            const warning =
                status === 'CANCELLED'
                    ? '\n\nLa cancelación es DEFINITIVA: la empresa no se puede reactivar.'
                    : '\n\nSus usuarios pierden el acceso de inmediato.';
            reason = window.prompt(`Motivo para ${action} "${company.name}":${warning}`)?.trim() ?? null;
            if (!reason) return;
        }

        setError(null);
        setBusyId(company.id);
        try {
            const updated = await changeCompanyStatus(company.id, status, reason, session.token);
            setCompanies((current) => current.map((c) => (c.id === updated.id ? updated : c)));
        } catch (e) {
            handleError(e);
        } finally {
            setBusyId(null);
        }
    }

    function handleCreated(result: ProvisionCompanyResponse) {
        setCreated(result);
        setShowForm(false);
        setError(null);
        void loadCompanies();
    }

    return (
        <main className="page">
            <header>
                <h1>Empresas</h1>
                <span className="muted">{session.username}</span>
                <button className="secondary" onClick={onLogout}>
                    Salir
                </button>
            </header>

            {error && (
                <p className="error" role="alert">
                    {error}{' '}
                    <button className="link" onClick={() => setError(null)}>
                        cerrar
                    </button>
                </p>
            )}

            {created && (
                <div className="card credentials" role="status">
                    <strong>Empresa “{created.companyName}” creada.</strong> Pasale estas credenciales al
                    administrador; la contraseña temporal no se vuelve a mostrar.
                    <dl>
                        <dt>Usuario</dt>
                        <dd>
                            <code>{created.adminUsername}</code>
                        </dd>
                        <dt>Email</dt>
                        <dd>{created.adminEmail}</dd>
                        <dt>Contraseña temporal</dt>
                        <dd>
                            <code>{created.temporaryPassword}</code>{' '}
                            <button
                                className="link"
                                onClick={() => void navigator.clipboard?.writeText(created.temporaryPassword)}
                            >
                                copiar
                            </button>
                        </dd>
                    </dl>
                    <button className="secondary" onClick={() => setCreated(null)}>
                        Listo, ya la guardé
                    </button>
                </div>
            )}

            {showForm ? (
                <NewCompanyForm
                    token={session.token}
                    onCreated={handleCreated}
                    onCancel={() => setShowForm(false)}
                    onError={handleError}
                />
            ) : (
                <div className="toolbar">
                    <button onClick={() => setShowForm(true)}>Nueva empresa</button>
                    <button className="secondary" onClick={() => void loadCompanies()} disabled={loading}>
                        {loading ? 'Cargando…' : 'Actualizar'}
                    </button>
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Razón social</th>
                        <th>CUIT</th>
                        <th>Estado</th>
                        <th>Alta</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.length === 0 && (
                        <tr>
                            <td colSpan={7} className="muted">
                                {loading ? 'Cargando…' : 'No hay empresas.'}
                            </td>
                        </tr>
                    )}
                    {companies.map((company) => {
                        const busy = busyId === company.id;
                        return (
                            <tr key={company.id}>
                                <td>{company.id}</td>
                                <td>{company.name}</td>
                                <td>{company.legalName ?? '—'}</td>
                                <td>{company.taxId ?? '—'}</td>
                                <td>
                                    <span className={`status status-${company.status.toLowerCase()}`}>
                                        {STATUS_LABELS[company.status]}
                                    </span>
                                    {company.statusReason && (
                                        <div className="muted small">
                                            {company.statusReason} · {formatDate(company.statusChangedAt)}
                                        </div>
                                    )}
                                </td>
                                <td>{formatDate(company.createdAt)}</td>
                                <td className="row-actions">
                                    {company.status === 'ACTIVE' && (
                                        <button
                                            className="secondary"
                                            disabled={busy}
                                            onClick={() => void changeStatus(company, 'SUSPENDED')}
                                        >
                                            Suspender
                                        </button>
                                    )}
                                    {company.status === 'SUSPENDED' && (
                                        <button
                                            className="secondary"
                                            disabled={busy}
                                            onClick={() => void changeStatus(company, 'ACTIVE')}
                                        >
                                            Reactivar
                                        </button>
                                    )}
                                    {company.status !== 'CANCELLED' && (
                                        <button
                                            className="danger"
                                            disabled={busy}
                                            onClick={() => void changeStatus(company, 'CANCELLED')}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </main>
    );
}
