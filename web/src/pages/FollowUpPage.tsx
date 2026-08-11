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
import type { Task, TaskActivity } from '@/api/types';
import { useTasks } from '@/hooks/useTasks';
import { useAllActivity } from '@/hooks/useActivities';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useAssignableUsers } from '@/hooks/useUsers';
import { useAuth } from '@/auth/AuthContext';
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
function dueColor(iso: string | null): string | undefined {
  if (!iso) {
    return undefined;
  }
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
  const { user } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const { data: activities } = useAllActivity();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const { data: users } = useAssignableUsers();

  const nameMaps = useMemo(() => {
    const company = new Map((companies ?? []).map((c) => [c.id, c.companyName]));
    const contact = new Map((contacts ?? []).map((c) => [c.id, c.contactName]));
    const person = new Map((users ?? []).map((u) => [u.id, u.name]));
    return { company, contact, person };
  }, [companies, contacts, users]);

  // The latest activity per task (activities come most-recent first, so the first
  // one seen for a task is its latest).
  const latestByTask = useMemo(() => {
    const map = new Map<string, TaskActivity>();
    for (const activity of activities ?? []) {
      if (!map.has(activity.taskId)) {
        map.set(activity.taskId, activity);
      }
    }
    return map;
  }, [activities]);

  const rows = useMemo(() => {
    const personName = (id: string | null) =>
      id ? (id === user?.id ? 'vos' : (nameMaps.person.get(id) ?? `#${id}`)) : '—';

    return (tasks ?? [])
      .map((task) => {
        const last = latestByTask.get(task.id);
        // The next step comes from the last activity's plan; falling back to the
        // task's own due date and title when nothing has been logged yet.
        const nextDate = last?.nextActionDate ?? task.dueDate;
        const nextWhat = last?.nextAction ?? task.title;
        return {
          taskId: task.id,
          task,
          company: task.companyId
            ? (nameMaps.company.get(task.companyId) ?? `#${task.companyId}`)
            : '—',
          contact: task.contactId
            ? (nameMaps.contact.get(task.contactId) ?? `#${task.contactId}`)
            : '—',
          lastDesc: last?.description ?? null,
          lastDate: last?.activityDate ?? null,
          doneBy: last ? personName(last.authorId) : null,
          nextDate,
          nextWhat,
          willDo: personName(task.assigneeId),
        };
      })
      .sort((a, b) => {
        // By next-action date ascending; tasks without one go last.
        if (a.nextDate === b.nextDate) return 0;
        if (!a.nextDate) return 1;
        if (!b.nextDate) return -1;
        return a.nextDate < b.nextDate ? -1 : 1;
      });
  }, [tasks, latestByTask, nameMaps, user]);

  const [drawerOpened, drawer] = useDisclosure(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const openTask = (task: Task) => {
    setActiveTask(task);
    drawer.open();
  };

  if (isLoading) {
    return <Loader />;
  }

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
              {rows.map((row) => (
                <Table.Tr
                  key={row.taskId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openTask(row.task)}
                >
                  <Table.Td>
                    <Text fw={500}>{row.company}</Text>
                  </Table.Td>
                  <Table.Td>{row.contact}</Table.Td>
                  <Table.Td>
                    {row.lastDesc ? (
                      <div>
                        <Text size="sm" lineClamp={2}>
                          {row.lastDesc}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {row.lastDate ? formatDate(row.lastDate) : ''}
                          {row.doneBy ? ` · ${row.doneBy}` : ''}
                        </Text>
                      </div>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {row.nextDate ? (
                      <Badge variant="light" color={dueColor(row.nextDate)}>
                        {formatDate(row.nextDate)}
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {row.nextWhat}
                    </Text>
                  </Table.Td>
                  <Table.Td>{row.willDo}</Table.Td>
                </Table.Tr>
              ))}
              {rows.length === 0 && (
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
