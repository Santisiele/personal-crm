import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useContacts } from '@/hooks/useContacts';
import { useLinkContact } from '@/hooks/useCompanies';

interface LinkContactModalProps {
  opened: boolean;
  onClose: () => void;
  companyId: string;
  /** Contacts already linked, excluded from the picker. */
  linkedContactIds: string[];
}

interface FormValues {
  contactId: string | null;
  roleInCompany: string;
  phone: string;
}

export function LinkContactModal({
  opened,
  onClose,
  companyId,
  linkedContactIds,
}: LinkContactModalProps) {
  const { data: contacts } = useContacts();
  const linkContact = useLinkContact();

  const form = useForm<FormValues>({
    initialValues: { contactId: null, roleInCompany: '', phone: '' },
    validate: {
      contactId: (v) => (v ? null : 'Elegí un contacto'),
    },
  });

  const options = (contacts ?? [])
    .filter((c) => !linkedContactIds.includes(c.id))
    .map((c) => ({ value: c.id, label: c.contactName }));

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      await linkContact.mutateAsync({
        companyId,
        input: {
          contactId: values.contactId!,
          roleInCompany: values.roleInCompany.trim() || null,
          phone: values.phone.trim() || null,
        },
      });
      notifications.show({ color: 'green', message: 'Contacto vinculado.' });
      form.reset();
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo vincular el contacto.',
      });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Vincular contacto" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <Select
            label="Contacto"
            placeholder="Elegí un contacto"
            data={options}
            searchable
            withAsterisk
            nothingFoundMessage="Sin contactos disponibles"
            {...form.getInputProps('contactId')}
          />
          <TextInput
            label="Rol en la empresa"
            placeholder="opcional"
            {...form.getInputProps('roleInCompany')}
          />
          <TextInput
            label="Teléfono"
            placeholder="opcional"
            {...form.getInputProps('phone')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={linkContact.isPending}>
              Vincular
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
