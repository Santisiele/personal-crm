import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconChevronDown,
  IconDots,
  IconLink,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import {
  useAssignableStatuses,
  useChangeCompanyStatus,
  useCompany,
  useDeleteCompany,
} from '@/hooks/useCompanies';
import { CompanyModal } from '@/components/CompanyModal';
import { LinkContactModal } from '@/components/LinkContactModal';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text>{value ?? '—'}</Text>
    </div>
  );
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { privileged } = useAuth();
  const { data: company, isLoading, isError } = useCompany(id);
  const changeStatus = useChangeCompanyStatus();
  const deleteCompany = useDeleteCompany();
  const statuses = useAssignableStatuses(company?.status);
  const [editOpened, editModal] = useDisclosure(false);
  const [linkOpened, linkModal] = useDisclosure(false);

  if (isLoading) {
    return <Loader />;
  }
  if (isError || !company) {
    return (
      <Stack>
        <Anchor onClick={() => navigate('/companies')}>← Volver</Anchor>
        <Text c="red">No se pudo cargar la empresa.</Text>
      </Stack>
    );
  }

  const handleStatus = async (status: string) => {
    try {
      await changeStatus.mutateAsync({ id: company.id, status });
      notifications.show({ color: 'green', message: `Estado: ${status}.` });
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo cambiar el estado.',
      });
    }
  };

  const confirmDelete = () => {
    modals.openConfirmModal({
      title: 'Eliminar empresa',
      children: (
        <Text size="sm">
          ¿Eliminar "{company.companyName}"? Es una baja lógica: sale del listado
          pero se conserva.
        </Text>
      ),
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteCompany.mutateAsync(company.id);
          notifications.show({ color: 'green', message: 'Empresa eliminada.' });
          navigate('/companies');
        } catch {
          notifications.show({ color: 'red', message: 'No se pudo eliminar.' });
        }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => navigate('/companies')}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div>
            <Title order={2}>{company.companyName}</Title>
            <Group gap="xs" mt={4}>
              {company.status ? (
                <Badge variant="light">{company.status}</Badge>
              ) : (
                <Badge variant="light" color="gray">
                  Sin estado
                </Badge>
              )}
            </Group>
          </div>
        </Group>

        {privileged && (
          <Group gap="xs">
            <Menu withinPortal position="bottom-end">
              <Menu.Target>
                <Button
                  variant="default"
                  rightSection={<IconChevronDown size={14} />}
                >
                  Estado
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {statuses.length === 0 && (
                  <Menu.Item disabled>Sin estados disponibles</Menu.Item>
                )}
                {statuses.map((status) => (
                  <Menu.Item
                    key={status}
                    disabled={status === company.status}
                    onClick={() => handleStatus(status)}
                  >
                    {status}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Button
              variant="default"
              leftSection={<IconPencil size={16} />}
              onClick={editModal.open}
            >
              Editar
            </Button>
            <Menu withinPortal position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" size={36}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={confirmDelete}
                >
                  Eliminar empresa
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>

      <Card withBorder padding="lg">
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <Field label="CUIT" value={company.cuit} />
          <Field label="Marca" value={company.brand} />
          <Field label="Producto" value={company.product} />
          <Field label="Origen" value={company.origin} />
        </SimpleGrid>
      </Card>

      <Card withBorder padding={0}>
        <Group justify="space-between" p="md">
          <Title order={4}>Contactos vinculados</Title>
          {privileged && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconLink size={14} />}
              onClick={linkModal.open}
            >
              Vincular contacto
            </Button>
          )}
        </Group>
        <Table.ScrollContainer minWidth={520}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Teléfono</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {company.contacts.map((contact) => (
                <Table.Tr key={contact.id}>
                  <Table.Td>{contact.contactName}</Table.Td>
                  <Table.Td>{contact.email ?? '—'}</Table.Td>
                  <Table.Td>{contact.roleInCompany ?? '—'}</Table.Td>
                  <Table.Td>{contact.phone ?? '—'}</Table.Td>
                </Table.Tr>
              ))}
              {company.contacts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="lg">
                      Sin contactos vinculados.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <CompanyModal
        opened={editOpened}
        onClose={editModal.close}
        company={company}
      />
      <LinkContactModal
        opened={linkOpened}
        onClose={linkModal.close}
        companyId={company.id}
        linkedContactIds={company.contacts.map((c) => c.id)}
      />
    </Stack>
  );
}
