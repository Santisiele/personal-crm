import {
  Button,
  Card,
  Group,
  List,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { AxiosError } from 'axios';
import { IconTag } from '@tabler/icons-react';
import {
  useCompanyStatuses,
  useCreateCompanyStatus,
} from '@/hooks/useCompanies';

export function CompanyStatusesPage() {
  const { data: statuses, isLoading } = useCompanyStatuses();
  const createStatus = useCreateCompanyStatus();

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
          <List spacing="xs" icon={<IconTag size={16} />}>
            {(statuses ?? []).map((status) => (
              <List.Item key={status.id}>{status.description}</List.Item>
            ))}
          </List>
        )}
      </Card>
    </Stack>
  );
}
