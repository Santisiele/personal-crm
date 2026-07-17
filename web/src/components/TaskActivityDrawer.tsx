import {
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Textarea,
  Timeline,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconActivity, IconUserShare } from '@tabler/icons-react';
import type { Task } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useActivities, useLogActivity } from '@/hooks/useActivities';
import { useAssignmentHistory } from '@/hooks/useAssignments';
import { useUserNames } from '@/hooks/useUsers';
import {
  ACTIVITY_ACTION_TYPES,
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  actionLabel,
} from '@/labels';

interface TaskActivityDrawerProps {
  task: Task | null;
  opened: boolean;
  onClose: () => void;
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toIso(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : todayIso();
}

export function TaskActivityDrawer({
  task,
  opened,
  onClose,
}: TaskActivityDrawerProps) {
  const { user } = useAuth();
  const taskId = opened ? (task?.id ?? null) : null;
  const { data: activities, isLoading } = useActivities(taskId);
  const { data: history } = useAssignmentHistory(taskId);
  const names = useUserNames();
  const logActivity = useLogActivity(task?.id ?? '');

  const personName = (id: string) =>
    id === user?.id ? 'vos' : (names.get(id) ?? `#${id}`);

  const form = useForm({
    initialValues: {
      actionType: 'NOTE',
      description: '',
      activityDate: new Date() as Date | null,
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      await logActivity.mutateAsync({
        actionType: values.actionType,
        // activity_status seeds DONE as the "completed" marker; the log records
        // things that happened, so a logged activity is DONE.
        status: 'DONE',
        activityDate: toIso(values.activityDate),
        description: values.description.trim() || undefined,
      });
      notifications.show({ color: 'green', message: 'Actividad registrada.' });
      form.reset();
    } catch {
      notifications.show({
        color: 'red',
        message: 'No se pudo registrar la actividad.',
      });
    }
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={<Text fw={600}>{task?.title ?? ''}</Text>}
    >
      <Stack>
        <Card withBorder padding="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Registrar actividad
              </Text>
              <Select
                label="Tipo"
                data={ACTIVITY_ACTION_TYPES.map((t) => ({
                  value: t,
                  label: actionLabel(t),
                }))}
                allowDeselect={false}
                {...form.getInputProps('actionType')}
              />
              <DatePickerInput
                label="Fecha"
                valueFormat="DD/MM/YYYY"
                {...form.getInputProps('activityDate')}
              />
              <Textarea
                label="Detalle"
                placeholder="Qué pasó (opcional)"
                autosize
                minRows={2}
                {...form.getInputProps('description')}
              />
              <Group justify="flex-end">
                <Button type="submit" size="xs" loading={logActivity.isPending}>
                  Registrar
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        <Divider label="Actividad" labelPosition="center" />

        {isLoading ? (
          <Loader size="sm" />
        ) : (activities ?? []).length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            Todavía no hay actividad registrada.
          </Text>
        ) : (
          <Timeline active={-1} bulletSize={22} lineWidth={2}>
            {(activities ?? []).map((activity) => (
              <Timeline.Item
                key={activity.id}
                bullet={<IconActivity size={12} />}
                title={actionLabel(activity.actionType)}
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
                    {personName(activity.authorId)}
                  </Text>
                  <Badge size="xs" variant="light">
                    {activity.status}
                  </Badge>
                </Group>
              </Timeline.Item>
            ))}
          </Timeline>
        )}

        {history && history.length > 0 && (
          <>
            <Divider label="Historial de asignaciones" labelPosition="center" />
            <Timeline active={-1} bulletSize={22} lineWidth={2}>
              {history.map((assignment) => (
                <Timeline.Item
                  key={assignment.id}
                  bullet={<IconUserShare size={12} />}
                  title={personName(assignment.assigneeId)}
                >
                  <Group gap="xs" mt={2}>
                    <Text size="xs" c="dimmed">
                      {new Date(assignment.assignedAt).toLocaleDateString(
                        'es-AR',
                      )}
                      {' · asignó '}
                      {personName(assignment.assignedById)}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={ASSIGNMENT_STATUS_COLORS[assignment.status]}
                    >
                      {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </Badge>
                  </Group>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Stack>
    </Drawer>
  );
}
