import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { IconTrash, IconUserPlus } from '@tabler/icons-react';
import { AxiosError } from 'axios';
import type { UserRole, UserView } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  useChangeUserRole,
  useCreateUser,
  useDeactivateUser,
  useUsers,
} from '@/hooks/useUsers';
import { ROLE_LABELS } from '@/labels';
import { Modal } from '@mantine/core';

const ROLE_COLORS: Record<UserRole, string> = {
  USER: 'gray',
  ADMIN: 'blue',
  CREATOR: 'grape',
};

const ROLE_OPTIONS = (['USER', 'ADMIN', 'CREATOR'] as const).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export function UsersPage() {
  const { user } = useAuth();
  const { data: users, isLoading } = useUsers();
  const changeRole = useChangeUserRole();
  const deactivate = useDeactivateUser();
  const createUser = useCreateUser();
  const [createOpened, createModal] = useDisclosure(false);

  // Only the CREATOR can assign roles today (an ADMIN is confined to plain users
  // and cannot grant above USER, which the API enforces). The control is shown
  // accordingly so the UI never offers an action that would 403.
  const canAssignRoles = user?.role === 'CREATOR';

  const form = useForm({
    initialValues: { name: '', password: '', role: 'USER' as UserRole },
    validate: {
      name: (v) => (v.trim() ? null : 'Ingresá un nombre'),
      password: (v) => (v.length >= 8 ? null : 'Mínimo 8 caracteres'),
    },
  });

  const handleRoleChange = async (target: UserView, role: UserRole) => {
    if (role === target.role) {
      return;
    }
    try {
      await changeRole.mutateAsync({ id: target.id, role });
      notifications.show({
        color: 'green',
        message: `${target.name} ahora es ${ROLE_LABELS[role]}.`,
      });
    } catch {
      notifications.show({ color: 'red', message: 'No se pudo cambiar el rol.' });
    }
  };

  const confirmDeactivate = (target: UserView) => {
    modals.openConfirmModal({
      title: 'Dar de baja usuario',
      children: (
        <Text size="sm">
          ¿Dar de baja a "{target.name}"? Es una baja lógica: no podrá iniciar
          sesión ni aparecer en el directorio, pero sus tareas históricas se
          conservan.
        </Text>
      ),
      labels: { confirm: 'Dar de baja', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deactivate.mutateAsync(target.id);
          notifications.show({ color: 'green', message: 'Usuario dado de baja.' });
        } catch {
          notifications.show({ color: 'red', message: 'No se pudo dar de baja.' });
        }
      },
    });
  };

  const handleCreate = form.onSubmit(async (values) => {
    try {
      await createUser.mutateAsync(values);
      notifications.show({ color: 'green', message: 'Usuario creado.' });
      form.reset();
      createModal.close();
    } catch (error) {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      notifications.show({
        color: 'red',
        message:
          status === 409
            ? 'Ya existe un usuario con ese nombre.'
            : 'No se pudo crear el usuario.',
      });
    }
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Usuarios</Title>
          <Text c="dimmed" size="sm">
            Directorio, roles y permisos del equipo.
          </Text>
        </div>
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={createModal.open}
        >
          Nuevo usuario
        </Button>
      </Group>

      <Card withBorder padding={0}>
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th w={80} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(users ?? []).map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      <Text fw={500}>
                        {u.name}
                        {isSelf && (
                          <Text span c="dimmed" size="sm">
                            {' '}
                            (vos)
                          </Text>
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {canAssignRoles && !isSelf ? (
                        <Menu withinPortal position="bottom-start">
                          <Menu.Target>
                            <Badge
                              color={ROLE_COLORS[u.role]}
                              variant="light"
                              style={{ cursor: 'pointer' }}
                            >
                              {ROLE_LABELS[u.role]}
                            </Badge>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {ROLE_OPTIONS.map((opt) => (
                              <Menu.Item
                                key={opt.value}
                                disabled={opt.value === u.role}
                                onClick={() => handleRoleChange(u, opt.value)}
                              >
                                {opt.label}
                              </Menu.Item>
                            ))}
                          </Menu.Dropdown>
                        </Menu>
                      ) : (
                        <Badge color={ROLE_COLORS[u.role]} variant="light">
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {!isSelf && (
                        <Tooltip label="Dar de baja">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => confirmDeactivate(u)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal
        opened={createOpened}
        onClose={createModal.close}
        title="Nuevo usuario"
        centered
      >
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput
              label="Nombre"
              withAsterisk
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Contraseña"
              type="password"
              withAsterisk
              {...form.getInputProps('password')}
            />
            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps('role')}
            />
            <Button type="submit" loading={createUser.isPending}>
              Crear
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
