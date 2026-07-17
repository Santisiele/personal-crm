import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconChecklist,
  IconProgress,
} from '@tabler/icons-react';
import type { Task } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { TASK_STATUS_LABELS } from '@/labels';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Metric {
  label: string;
  value: number;
  icon: typeof IconChecklist;
  color: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useTasks();

  const metrics = useMemo<Metric[]>(() => {
    const all: Task[] = tasks ?? [];
    const today = todayIso();
    const open = all.filter((t) => t.status !== 'DONE');
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
    const dueToday = open.filter((t) => t.dueDate === today);
    const inProgress = all.filter((t) => t.status === 'IN_PROGRESS');
    const done = all.filter((t) => t.status === 'DONE');
    return [
      { label: 'Vencidas', value: overdue.length, icon: IconAlertTriangle, color: 'red' },
      { label: 'Para hoy', value: dueToday.length, icon: IconCalendarDue, color: 'orange' },
      { label: 'En progreso', value: inProgress.length, icon: IconProgress, color: 'blue' },
      { label: 'Completadas', value: done.length, icon: IconChecklist, color: 'green' },
    ];
  }, [tasks]);

  const byStatus = useMemo(() => {
    const counts = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const task of tasks ?? []) {
      counts[task.status] += 1;
    }
    return counts;
  }, [tasks]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <div>
        <Title order={2}>Hola, {user?.name}</Title>
        <Text c="dimmed" size="sm">
          Este es el resumen de tus tareas.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        {metrics.map((metric) => (
          <Card key={metric.label} withBorder padding="lg" component={Link} to="/tasks">
            <Group>
              <ThemeIcon color={metric.color} variant="light" size={44} radius="md">
                <metric.icon size={24} />
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700}>
                  {metric.value}
                </Text>
                <Text size="sm" c="dimmed">
                  {metric.label}
                </Text>
              </div>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Tareas por estado
        </Title>
        <Stack gap="xs">
          {(['PENDING', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
            <Group key={status} justify="space-between">
              <Text size="sm">{TASK_STATUS_LABELS[status]}</Text>
              <Text size="sm" fw={600}>
                {byStatus[status]}
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
