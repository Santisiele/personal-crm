import { useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { TaskAssignment } from '@/api/types';
import { useTasks } from '@/hooks/useTasks';
import { useUserNames } from '@/hooks/useUsers';
import {
  usePendingAssignments,
  useRespondToAssignment,
} from '@/hooks/useAssignments';

export function InboxPage() {
  const { data: assignments, isLoading } = usePendingAssignments();
  const { data: tasks } = useTasks();
  const names = useUserNames();
  const { accept, reject } = useRespondToAssignment();

  // The task list carries the titles; assignments only reference a task id.
  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks ?? []) {
      map.set(task.id, task.title);
    }
    return map;
  }, [tasks]);

  const respond = async (
    action: typeof accept | typeof reject,
    assignment: TaskAssignment,
    verb: string,
  ) => {
    try {
      await action.mutateAsync({
        taskId: assignment.taskId,
        id: assignment.id,
      });
      notifications.show({ color: 'green', message: `Asignación ${verb}.` });
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo responder la asignación.',
      });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  const items = assignments ?? [];

  return (
    <Stack maw={640}>
      <div>
        <Title order={2}>Bandeja de asignaciones</Title>
        <Text c="dimmed" size="sm">
          Tareas que te asignaron y esperan tu respuesta.
        </Text>
      </div>

      {items.length === 0 ? (
        <Card withBorder padding="xl">
          <Text c="dimmed" ta="center">
            No tenés asignaciones pendientes. 🎉
          </Text>
        </Card>
      ) : (
        <Stack>
          {items.map((assignment) => (
            <Card key={assignment.id} withBorder padding="md">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text fw={600}>
                    {titleById.get(assignment.taskId) ??
                      `Tarea #${assignment.taskId}`}
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Badge variant="light" color="orange">
                      Pendiente
                    </Badge>
                    <Text size="xs" c="dimmed">
                      Asignada por{' '}
                      {names.get(assignment.assignedById) ??
                        `#${assignment.assignedById}`}{' '}
                      ·{' '}
                      {new Date(assignment.assignedAt).toLocaleDateString(
                        'es-AR',
                      )}
                    </Text>
                  </Group>
                </div>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    loading={accept.isPending}
                    onClick={() => respond(accept, assignment, 'aceptada')}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconX size={14} />}
                    loading={reject.isPending}
                    onClick={() => respond(reject, assignment, 'rechazada')}
                  >
                    Rechazar
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
