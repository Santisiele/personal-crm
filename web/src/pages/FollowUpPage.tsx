import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Task } from '@/api/types';
import { useTasks } from '@/hooks/useTasks';
import { useFollowUps } from '@/hooks/useFollowUps';
import { TaskActivityDrawer } from '@/components/TaskActivityDrawer';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR');
}

/** Colour of a next-action date by urgency: overdue red, today orange, else. */
function dueColor(iso: string): string {
  const today = todayIso();
  if (iso < today) {
    return 'red';
  }
  if (iso === today) {
    return 'orange';
  }
  return 'blue';
}

export function FollowUpPage() {
  const { data: rows, isLoading } = useFollowUps();
  const { data: tasks } = useTasks();

  const taskById = useMemo(
    () => new Map((tasks ?? []).map((t) => [t.id, t])),
    [tasks],
  );

  const [drawerOpened, drawer] = useDisclosure(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const openTask = (taskId: string) => {
    const task = taskById.get(taskId);
    if (task) {
      setActiveTask(task);
      drawer.open();
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  const items = rows ?? [];

  return (
    <Stack>
      <div>
        <Title order={2}>Seguimiento</Title>
        <Text c="dimmed" size="sm">
          Una fila por tarea, ordenada por la próxima acción (lo más urgente
          arriba). Tocá una fila para ver el detalle y registrar actividad.
        </Text>
      </div>

      <Card withBorder padding={0}>
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Empresa</Table.Th>
                <Table.Th>Con quién</Table.Th>
                <Table.Th>Última acción</Table.Th>
                <Table.Th>Próxima acción</Table.Th>
                <Table.Th>Qué hacer</Table.Th>
                <Table.Th>Quién lo hará</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((row) => (
                <Table.Tr
                  key={row.taskId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openTask(row.taskId)}
                >
                  <Table.Td>
                    <Text fw={500}>{row.company ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>{row.contact ?? '—'}</Table.Td>
                  <Table.Td>
                    {row.lastAction ? (
                      <div>
                        <Text size="sm" lineClamp={2}>
                          {row.lastAction.description ?? '—'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDate(row.lastAction.date)} · {row.lastAction.by}
                        </Text>
                      </div>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {row.nextActionDate ? (
                      <Badge variant="light" color={dueColor(row.nextActionDate)}>
                        {formatDate(row.nextActionDate)}
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {row.nextAction}
                    </Text>
                  </Table.Td>
                  <Table.Td>{row.willDo ?? '—'}</Table.Td>
                </Table.Tr>
              ))}
              {items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="xl">
                      No hay tareas para seguir.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <TaskActivityDrawer
        task={activeTask}
        opened={drawerOpened}
        onClose={drawer.close}
      />
    </Stack>
  );
}
