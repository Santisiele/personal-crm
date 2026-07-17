import { useEffect } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { Contact } from '@/api/types';
import { useCreateContact, useEditContact } from '@/hooks/useContacts';

interface ContactModalProps {
  opened: boolean;
  onClose: () => void;
  contact?: Contact | null;
}

interface FormValues {
  contactName: string;
  email: string;
  birth: Date | null;
}

function toDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00`) : null;
}

function toIso(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ContactModal({ opened, onClose, contact }: ContactModalProps) {
  const createContact = useCreateContact();
  const editContact = useEditContact();
  const editing = Boolean(contact);

  const form = useForm<FormValues>({
    initialValues: { contactName: '', email: '', birth: null },
    validate: {
      contactName: (v) => (v.trim() ? null : 'El nombre es obligatorio'),
      email: (v) =>
        !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email inválido',
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }
    form.setValues({
      contactName: contact?.contactName ?? '',
      email: contact?.email ?? '',
      birth: toDate(contact?.birth ?? null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, contact]);

  const handleSubmit = form.onSubmit(async (values) => {
    const payload = {
      contactName: values.contactName,
      email: values.email.trim() ? values.email.trim() : null,
      birth: toIso(values.birth),
    };
    try {
      if (editing && contact) {
        await editContact.mutateAsync({ id: contact.id, input: payload });
        notifications.show({ color: 'green', message: 'Contacto actualizado.' });
      } else {
        await createContact.mutateAsync(payload);
        notifications.show({ color: 'green', message: 'Contacto creado.' });
      }
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo guardar el contacto.',
      });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? 'Editar contacto' : 'Nuevo contacto'}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Nombre"
            withAsterisk
            {...form.getInputProps('contactName')}
          />
          <TextInput
            label="Email"
            placeholder="opcional"
            {...form.getInputProps('email')}
          />
          <DatePickerInput
            label="Cumpleaños"
            placeholder="opcional"
            clearable
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('birth')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={createContact.isPending || editContact.isPending}
            >
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
