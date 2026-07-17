import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { Task } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useCreateTask, useEditTask } from '@/hooks/useTasks';

interface TaskModalProps {
  opened: boolean;
  onClose: () => void;
  /** When set, the modal edits this task; otherwise it creates a new one. */
  task?: Task | null;
  /** Pre-fills the due date (e.g. the day clicked on the calendar). */
  defaultDate?: string | null;
}

interface FormValues {
  title: string;
  description: string;
  dueDate: Date | null;
  assigneeId: string | null;
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

export function TaskModal({
  opened,
  onClose,
  task,
  defaultDate,
}: TaskModalProps) {
  const { user, privileged } = useAuth();
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const editTask = useEditTask();
  const editing = Boolean(task);

  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      dueDate: null,
      assigneeId: user?.id ?? null,
    },
    validate: {
      title: (v) => (v.trim() ? null : 'El título es obligatorio'),
      description: (v) => (v.trim() ? null : 'La descripción es obligatoria'),
    },
  });

  // Re-seed the form whenever the modal opens for a different task/day.
  useEffect(() => {
    if (!opened) {
      return;
    }
    form.setValues({
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: toDate(task?.dueDate ?? defaultDate ?? null),
      assigneeId: task?.assigneeId ?? user?.id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, task, defaultDate]);

  const assigneeOptions =
    users?.map((u) => ({ value: u.id, label: u.name })) ?? [];

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      if (editing && task) {
        await editTask.mutateAsync({
          id: task.id,
          input: {
            title: values.title,
            description: values.description,
            dueDate: toIso(values.dueDate),
          },
        });
        notifications.show({ color: 'green', message: 'Tarea actualizada.' });
      } else {
        await createTask.mutateAsync({
          title: values.title,
          description: values.description,
          dueDate: toIso(values.dueDate),
          // Only privileged actors may assign to someone else; a plain user's
          // task is self-assigned by omitting assigneeId.
          assigneeId: privileged ? values.assigneeId : undefined,
        });
        notifications.show({ color: 'green', message: 'Tarea creada.' });
      }
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo guardar la tarea.',
      });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? 'Editar tarea' : 'Nueva tarea'}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Título"
            placeholder="¿Qué hay que hacer?"
            withAsterisk
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Descripción"
            placeholder="Detalles de la tarea"
            autosize
            minRows={2}
            withAsterisk
            {...form.getInputProps('description')}
          />
          <DatePickerInput
            label="Fecha de vencimiento"
            placeholder="Sin fecha"
            clearable
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('dueDate')}
          />
          {privileged && !editing && (
            <Select
              label="Asignar a"
              placeholder="Elegí un usuario"
              data={assigneeOptions}
              searchable
              clearable
              {...form.getInputProps('assigneeId')}
            />
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={createTask.isPending || editTask.isPending}
            >
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
