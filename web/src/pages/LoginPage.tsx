import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Anchor,
  Button,
  Card,
  Center,
  Loader,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { AxiosError } from 'axios';
import { register } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';

export function LoginPage() {
  const { user, loading, login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { name: '', password: '' },
    validate: {
      name: (v) => (v.trim().length > 0 ? null : 'Ingresá tu nombre'),
      password: (v) =>
        v.length >= 8 ? null : 'La contraseña debe tener al menos 8 caracteres',
    },
  });

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (mode === 'register') {
        // New users self-register as plain USERs (the API enforces this); a
        // CREATOR can promote them later from the Users screen.
        await register(values);
        await login(values.name, values.password);
      } else {
        await login(values.name, values.password);
      }
      await refreshUser();
      navigate('/', { replace: true });
    } catch (error) {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      const message =
        status === 401
          ? 'Nombre o contraseña incorrectos.'
          : status === 409
            ? 'Ya existe un usuario con ese nombre.'
            : 'No se pudo completar la operación. Reintentá.';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Center h="100vh" p="md">
      <Card withBorder shadow="sm" padding="xl" w={400} maw="100%">
        <Stack>
          <div>
            <Title order={2}>Personal CRM</Title>
            <Text c="dimmed" size="sm">
              {mode === 'login'
                ? 'Ingresá para gestionar tus tareas y contactos.'
                : 'Creá tu cuenta para empezar.'}
            </Text>
          </div>

          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Nombre"
                placeholder="Tu nombre de usuario"
                {...form.getInputProps('name')}
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                {...form.getInputProps('password')}
              />
              <Button type="submit" loading={submitting} fullWidth>
                {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Button>
            </Stack>
          </form>

          <Text size="sm" ta="center">
            {mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <Anchor
              component="button"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Registrate' : 'Ingresá'}
            </Anchor>
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
