import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { AxiosError } from 'axios';
import { IconTag, IconTrash } from '@tabler/icons-react';
import type { CompanyStatus } from '@/api/types';
import {
  useCompanyStatuses,
  useCreateCompanyStatus,
  useDeleteCompanyStatus,
} from '@/hooks/useCompanies';

export function CompanyStatusesPage() {
  const { data: statuses, isLoading } = useCompanyStatuses();
  const createStatus = useCreateCompanyStatus();
  const deleteStatus = useDeleteCompanyStatus();

  const confirmDelete = (status: CompanyStatus) => {
    modals.openConfirmModal({
      title: 'Eliminar estado',
      children: (
        <Text size="sm">
          ¿Eliminar el estado "{status.description}"? Deja de ofrecerse para
          nuevas empresas; las que ya lo tienen lo conservan.
        </Text>
      ),
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteStatus.mutateAsync(status.id);
          notifications.show({ color: 'green', message: 'Estado eliminado.' });
        } catch {
          notifications.show({ color: 'red', message: 'No se pudo eliminar.' });
        }
      },
    });
  };

  const form = useForm({
    initialValues: { description: '' },
    validate: {
      description: (v) => (v.trim() ? null : 'Ingresá una descripción'),
    },
  });

  const handleSubmit = form.onSubmit(async ({ description }) => {
    try {
      await createStatus.mutateAsync(description.trim());
      notifications.show({ color: 'green', message: 'Estado creado.' });
      form.reset();
    } catch (error) {
      const status =
        error instanceof AxiosError ? error.response?.status : undefined;
      notifications.show({
        color: 'red',
        message:
          status === 409
            ? 'Ya existe un estado con esa descripción.'
            : 'No se pudo crear el estado.',
      });
    }
  });

  return (
    <Stack maw={560}>
      <div>
        <Title order={2}>Estados de empresa</Title>
        <Text c="dimmed" size="sm">
          Los valores de estado comercial que las empresas pueden tener. Es dato
          libre: podés nombrarlos en español.
        </Text>
      </div>

      <Card withBorder padding="lg">
        <form onSubmit={handleSubmit}>
          <Group align="flex-end">
            <TextInput
              label="Nuevo estado"
              placeholder="Ej: Prospecto"
              style={{ flex: 1 }}
              {...form.getInputProps('description')}
            />
            <Button type="submit" loading={createStatus.isPending}>
              Agregar
            </Button>
          </Group>
        </form>
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="sm">
          Estados existentes
        </Title>
        {isLoading ? (
          <Loader size="sm" />
        ) : (statuses ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">
            Todavía no hay estados.
          </Text>
        ) : (
          <Stack gap={0}>
            {(statuses ?? []).map((status, i) => (
              <div key={status.id}>
                {i > 0 && <Divider />}
                <Group justify="space-between" py="xs" wrap="nowrap">
                  <Group gap="xs">
                    <IconTag size={16} />
                    <Text>{status.description}</Text>
                  </Group>
                  <Tooltip label="Eliminar">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => confirmDelete(status)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
