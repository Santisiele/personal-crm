import {
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { changeOwnPassword } from '@/api/users';
import { useAuth } from '@/auth/AuthContext';
import { ROLE_LABELS } from '@/labels';

export function ProfilePage() {
  const { user } = useAuth();

  const form = useForm({
    initialValues: { newPassword: '', confirm: '' },
    validate: {
      newPassword: (v) =>
        v.length >= 8 ? null : 'La contraseña debe tener al menos 8 caracteres',
      confirm: (v, values) =>
        v === values.newPassword ? null : 'Las contraseñas no coinciden',
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      await changeOwnPassword(values.newPassword);
      notifications.show({ color: 'green', message: 'Contraseña actualizada.' });
      form.reset();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo cambiar la contraseña.',
      });
    }
  });

  return (
    <Stack maw={480}>
      <Title order={2}>Mi perfil</Title>

      <Card withBorder padding="lg">
        <Group justify="space-between">
          <div>
            <Text fw={600}>{user?.name}</Text>
            <Text size="sm" c="dimmed">
              Rol de la cuenta
            </Text>
          </div>
          {user && <Badge variant="light">{ROLE_LABELS[user.role]}</Badge>}
        </Group>
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Cambiar contraseña
        </Title>
        <form onSubmit={handleSubmit}>
          <Stack>
            <PasswordInput
              label="Nueva contraseña"
              withAsterisk
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label="Confirmar contraseña"
              withAsterisk
              {...form.getInputProps('confirm')}
            />
            <Group justify="flex-end">
              <Button type="submit">Actualizar</Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
