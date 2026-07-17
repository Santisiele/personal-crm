import { useEffect } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { Company } from '@/api/types';
import { useCreateCompany, useEditCompany } from '@/hooks/useCompanies';

interface CompanyModalProps {
  opened: boolean;
  onClose: () => void;
  company?: Company | null;
}

interface FormValues {
  companyName: string;
  cuit: string;
  brand: string;
  product: string;
  origin: string;
}

const EMPTY: FormValues = {
  companyName: '',
  cuit: '',
  brand: '',
  product: '',
  origin: '',
};

/** Trims a field to null so empty inputs clear the value rather than store "". */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function CompanyModal({ opened, onClose, company }: CompanyModalProps) {
  const createCompany = useCreateCompany();
  const editCompany = useEditCompany();
  const editing = Boolean(company);

  const form = useForm<FormValues>({
    initialValues: EMPTY,
    validate: {
      companyName: (v) => (v.trim() ? null : 'El nombre es obligatorio'),
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }
    form.setValues({
      companyName: company?.companyName ?? '',
      cuit: company?.cuit ?? '',
      brand: company?.brand ?? '',
      product: company?.product ?? '',
      origin: company?.origin ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, company]);

  const handleSubmit = form.onSubmit(async (values) => {
    const payload = {
      companyName: values.companyName.trim(),
      cuit: orNull(values.cuit),
      brand: orNull(values.brand),
      product: orNull(values.product),
      origin: orNull(values.origin),
    };
    try {
      if (editing && company) {
        await editCompany.mutateAsync({ id: company.id, input: payload });
        notifications.show({ color: 'green', message: 'Empresa actualizada.' });
      } else {
        await createCompany.mutateAsync(payload);
        notifications.show({ color: 'green', message: 'Empresa creada.' });
      }
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo guardar la empresa.',
      });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? 'Editar empresa' : 'Nueva empresa'}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Nombre"
            withAsterisk
            {...form.getInputProps('companyName')}
          />
          <TextInput label="CUIT" {...form.getInputProps('cuit')} />
          <TextInput label="Marca" {...form.getInputProps('brand')} />
          <TextInput label="Producto" {...form.getInputProps('product')} />
          <TextInput label="Origen" {...form.getInputProps('origin')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={createCompany.isPending || editCompany.isPending}
            >
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
