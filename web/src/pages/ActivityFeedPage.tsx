import { useMemo } from 'react';
import {
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import { useAllActivity } from '@/hooks/useActivities';
import { useTasks } from '@/hooks/useTasks';
import { useUserNames } from '@/hooks/useUsers';
import { actionLabel } from '@/labels';

export function ActivityFeedPage() {
  const { data: activities, isLoading } = useAllActivity();
  const { data: tasks } = useTasks();
  const names = useUserNames();

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks ?? []) {
      map.set(task.id, task.title);
    }
    return map;
  }, [tasks]);

  if (isLoading) {
    return <Loader />;
  }

  const items = activities ?? [];

  return (
    <Stack maw={720}>
      <div>
        <Title order={2}>Actividad del equipo</Title>
        <Text c="dimmed" size="sm">
          Todo lo registrado en las tareas, lo más reciente primero.
        </Text>
      </div>

      {items.length === 0 ? (
        <Card withBorder padding="xl">
          <Text c="dimmed" ta="center">
            Todavía no hay actividad registrada.
          </Text>
        </Card>
      ) : (
        <Card withBorder padding="lg">
          <Timeline active={-1} bulletSize={24} lineWidth={2}>
            {items.map((activity) => (
              <Timeline.Item
                key={activity.id}
                bullet={<IconActivity size={13} />}
                title={
                  <Group gap="xs">
                    <Text fw={600} size="sm">
                      {actionLabel(activity.actionType)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      · {titleById.get(activity.taskId) ?? `Tarea #${activity.taskId}`}
                    </Text>
                  </Group>
                }
              >
                {activity.description && (
                  <Text size="sm">{activity.description}</Text>
                )}
                <Group gap="xs" mt={2}>
                  <Text size="xs" c="dimmed">
                    {new Date(
                      `${activity.activityDate}T00:00:00`,
                    ).toLocaleDateString('es-AR')}
                    {' · '}
                    {names.get(activity.authorId) ?? `#${activity.authorId}`}
                  </Text>
                  <Badge size="xs" variant="light">
                    {activity.status}
                  </Badge>
                </Group>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}
    </Stack>
  );
}
