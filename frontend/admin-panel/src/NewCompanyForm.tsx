import { useState, type ChangeEvent, type FormEvent } from 'react';

import { provisionCompany } from './api';
import type { ProvisionCompanyRequest, ProvisionCompanyResponse } from './types';

type Props = {
    token: string;
    onCreated: (result: ProvisionCompanyResponse) => void;
    onCancel: () => void;
    onError: (error: unknown) => void;
};

const EMPTY_FORM = {
    companyName: '',
    legalName: '',
    taxId: '',
    adminUsername: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
};

type FormState = typeof EMPTY_FORM;

// Los opcionales vacíos no se mandan: el backend usa sus defaults.
function toRequest(form: FormState): ProvisionCompanyRequest {
    const optional = (value: string) => value.trim() || undefined;
    return {
        companyName: form.companyName.trim(),
        legalName: optional(form.legalName),
        taxId: optional(form.taxId),
        adminUsername: form.adminUsername.trim(),
        adminEmail: form.adminEmail.trim(),
        adminFirstName: optional(form.adminFirstName),
        adminLastName: optional(form.adminLastName),
    };
}

export function NewCompanyForm({ token, onCreated, onCancel, onError }: Props) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [busy, setBusy] = useState(false);

    function field(name: keyof FormState) {
        return {
            value: form[name],
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
                setForm((current) => ({ ...current, [name]: e.target.value })),
            disabled: busy,
        };
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        try {
            onCreated(await provisionCompany(toRequest(form), token));
        } catch (e) {
            onError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="card new-company" onSubmit={handleSubmit}>
            <h2>Nueva empresa</h2>
            <fieldset>
                <legend>Empresa</legend>
                <label>
                    Nombre *
                    <input {...field('companyName')} maxLength={100} required />
                </label>
                <label>
                    Razón social
                    <input {...field('legalName')} maxLength={150} />
                </label>
                <label>
                    CUIT
                    <input {...field('taxId')} maxLength={20} />
                </label>
            </fieldset>
            <fieldset>
                <legend>Usuario administrador</legend>
                <label>
                    Usuario *
                    <input {...field('adminUsername')} maxLength={50} autoComplete="off" required />
                </label>
                <label>
                    Email *
                    <input {...field('adminEmail')} type="email" maxLength={100} required />
                </label>
                <label>
                    Nombre
                    <input {...field('adminFirstName')} maxLength={100} />
                </label>
                <label>
                    Apellido
                    <input {...field('adminLastName')} maxLength={100} />
                </label>
            </fieldset>
            <div className="actions">
                <button type="submit" disabled={busy}>
                    {busy ? 'Creando…' : 'Crear empresa'}
                </button>
                <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
