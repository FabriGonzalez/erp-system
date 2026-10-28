import { useEffect, useState } from 'react';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { useSaveBranch } from '@/hooks/use-branch-queries';
import { Branch } from '@/types/branch';

type BranchFormModalProps = {
    visible: boolean;
    branchToEdit?: Branch | null;
    onClose: () => void;
};

export function BranchFormModal({
    visible,
    branchToEdit,
    onClose,
}: BranchFormModalProps) {
    const saveBranch = useSaveBranch();

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEdit = !!branchToEdit;

    useEffect(() => {
        if (visible) {
            // Reset the form when opening a different branch.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(branchToEdit?.name ?? '');
            setAddress(branchToEdit?.address ?? '');
            setPhone(branchToEdit?.phone ?? '');
            setErrorMessage(null);
        }
    }, [visible, branchToEdit]);

    async function handleSubmit() {
        if (!name.trim()) {
            setErrorMessage('El nombre de la sucursal es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await saveBranch.mutateAsync({
                id: isEdit ? branchToEdit?.id : undefined,
                data: {
                    name: name.trim(),
                    address: address.trim() || undefined,
                    phone: phone.trim() || undefined,
                },
            });
            onClose();
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error && err.message ? err.message : 'Error al guardar la sucursal.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalCard
            visible={visible}
            title={isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
            onClose={onClose}
            closeDisabled={isSubmitting}
            error={errorMessage}
            footer={[
                <AppButton key="cancel" title="Cancelar" variant="secondary" onPress={onClose} disabled={isSubmitting} />,
                <AppButton
                    key="save"
                    title={isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />,
            ]}
        >
            <FormField label="Nombre *">
                <AppInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej: Sucursal Centro"
                    autoCapitalize="words"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Dirección">
                <AppInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Ej: Av. San Martín 1234"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Teléfono">
                <AppInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Ej: 11 4455-6677"
                    keyboardType="phone-pad"
                    editable={!isSubmitting}
                />
            </FormField>
        </ModalCard>
    );
}
