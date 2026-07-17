import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Task, TaskStatus } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useChangeTaskStatus, useTasks } from '@/hooks/useTasks';
import { useUserNames } from '@/hooks/useUsers';
import { colorForUser } from '@/hooks/userColors';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '@/labels';

export function KanbanPage() {
  const { privileged } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const changeStatus = useChangeTaskStatus();
  const names = useUserNames();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of tasks ?? []) {
      groups[task.status].push(task);
    }
    return groups;
  }, [tasks]);

  const personName = (id: string | null) =>
    id ? (names.get(id) ?? `#${id}`) : 'Sin asignar';

  const onDrop = async (status: TaskStatus, taskId: string) => {
    setDragOver(null);
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task || task.status === status) {
      return;
    }
    try {
      await changeStatus.mutateAsync({ id: taskId, status });
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo mover la tarea.',
      });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <div>
        <Title order={2}>Tablero</Title>
        <Text c="dimmed" size="sm">
          {privileged
            ? 'Todas las tareas del equipo por estado. Arrastrá para cambiar el estado.'
            : 'Tus tareas por estado. Arrastrá una tarjeta para cambiar su estado.'}
        </Text>
      </div>

      <Group align="flex-start" grow wrap="nowrap" style={{ overflowX: 'auto' }}>
        {TASK_STATUS_ORDER.map((status) => (
          <Paper
            key={status}
            withBorder
            p="sm"
            miw={260}
            bg={dragOver === status ? 'var(--mantine-color-default-hover)' : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              void onDrop(status, e.dataTransfer.getData('text/plain'));
            }}
          >
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{TASK_STATUS_LABELS[status]}</Text>
              <Badge variant="light" color="gray">
                {byStatus[status].length}
              </Badge>
            </Group>
            <Stack gap="xs">
              {byStatus[status].map((task) => (
                <Card
                  key={task.id}
                  withBorder
                  padding="sm"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData('text/plain', task.id)
                  }
                  style={{ cursor: 'grab' }}
                >
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <div
                      style={{
                        width: 4,
                        alignSelf: 'stretch',
                        borderRadius: 2,
                        background: colorForUser(task.assigneeId),
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} lineClamp={2}>
                        {task.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {personName(task.assigneeId)}
                        {task.dueDate
                          ? ` · ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('es-AR')}`
                          : ''}
                      </Text>
                    </div>
                  </Group>
                </Card>
              ))}
              {byStatus[status].length === 0 && (
                <Text c="dimmed" size="xs" ta="center" py="md">
                  Sin tareas.
                </Text>
              )}
            </Stack>
          </Paper>
        ))}
      </Group>
    </Stack>
  );
}
