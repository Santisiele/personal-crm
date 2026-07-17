import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import type { Contact } from '@/api/types';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import { ContactModal } from '@/components/ContactModal';

export function ContactsPage() {
  const { data: contacts, isLoading } = useContacts();
  const deleteContact = useDeleteContact();
  const [opened, modal] = useDisclosure(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const openCreate = () => {
    setEditing(null);
    modal.open();
  };
  const openEdit = (contact: Contact) => {
    setEditing(contact);
    modal.open();
  };

  const confirmDelete = (contact: Contact) => {
    modals.openConfirmModal({
      title: 'Eliminar contacto',
      children: (
        <Text size="sm">
          ¿Eliminar a "{contact.contactName}"? Es una baja lógica: sale del
          listado pero se conserva para las referencias históricas.
        </Text>
      ),
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteContact.mutateAsync(contact.id);
          notifications.show({ color: 'green', message: 'Contacto eliminado.' });
        } catch {
          notifications.show({ color: 'red', message: 'No se pudo eliminar.' });
        }
      },
    });
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Contactos</Title>
          <Text c="dimmed" size="sm">
            Personas de tu red.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nuevo contacto
        </Button>
      </Group>

      <Card withBorder padding={0}>
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Cumpleaños</Table.Th>
                <Table.Th w={90} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(contacts ?? []).map((contact) => (
                <Table.Tr key={contact.id}>
                  <Table.Td>
                    <Text fw={500}>{contact.contactName}</Text>
                  </Table.Td>
                  <Table.Td>
                    {contact.email ?? (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {contact.birth ? (
                      new Date(`${contact.birth}T00:00:00`).toLocaleDateString(
                        'es-AR',
                      )
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Editar">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openEdit(contact)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmDelete(contact)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(contacts ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="xl">
                      Todavía no hay contactos.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <ContactModal opened={opened} onClose={modal.close} contact={editing} />
    </Stack>
  );
}
