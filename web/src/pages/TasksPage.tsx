import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  IconArchive,
  IconDots,
  IconEdit,
  IconPlus,
} from '@tabler/icons-react';
import type { Task, TaskStatus } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  useArchiveTask,
  useChangeTaskStatus,
  useTasks,
} from '@/hooks/useTasks';
import { useUserNames } from '@/hooks/useUsers';
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '@/labels';
import { TaskModal } from '@/components/TaskModal';

type StatusFilter = TaskStatus | 'ALL';

export function TasksPage() {
  const { user, privileged } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const names = useUserNames();
  const changeStatus = useChangeTaskStatus();
  const archive = useArchiveTask();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [modalOpened, modal] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const all = tasks ?? [];
    if (statusFilter === 'ALL') {
      return all;
    }
    return all.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const personName = (id: string | null) => {
    if (!id) {
      return 'Sin asignar';
    }
    if (id === user?.id) {
      return 'Vos';
    }
    return names.get(id) ?? `#${id}`;
  };

  const openCreate = () => {
    setEditingTask(null);
    modal.open();
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    modal.open();
  };

  const handleStatus = async (task: Task, status: TaskStatus) => {
    try {
      await changeStatus.mutateAsync({ id: task.id, status });
    } catch {
      notifications.show({ color: 'red', message: 'No se pudo cambiar el estado.' });
    }
  };

  const confirmArchive = (task: Task) => {
    modals.openConfirmModal({
      title: 'Archivar tarea',
      children: (
        <Text size="sm">
          ¿Seguro que querés archivar "{task.title}"? Es una baja lógica: sale de
          la lista pero queda registrada.
        </Text>
      ),
      labels: { confirm: 'Archivar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await archive.mutateAsync({ id: task.id, reason: 'Archivada desde la app' });
          notifications.show({ color: 'green', message: 'Tarea archivada.' });
        } catch {
          notifications.show({ color: 'red', message: 'No se pudo archivar.' });
        }
      },
    });
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Tareas</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nueva tarea
        </Button>
      </Group>

      <SegmentedControl
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as StatusFilter)}
        data={[
          { value: 'ALL', label: 'Todas' },
          ...TASK_STATUS_ORDER.map((s) => ({
            value: s,
            label: TASK_STATUS_LABELS[s],
          })),
        ]}
      />

      <Card withBorder padding={0}>
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Responsable</Table.Th>
                <Table.Th>Vencimiento</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th w={60} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((task) => (
                <Table.Tr key={task.id}>
                  <Table.Td>
                    <Text fw={500}>{task.title}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {task.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>{personName(task.assigneeId)}</Table.Td>
                  <Table.Td>
                    {task.dueDate ? (
                      new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(
                        'es-AR',
                      )
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Menu withinPortal position="bottom-start">
                      <Menu.Target>
                        <Badge
                          color={TASK_STATUS_COLORS[task.status]}
                          variant="light"
                          style={{ cursor: 'pointer' }}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {TASK_STATUS_ORDER.map((s) => (
                          <Menu.Item
                            key={s}
                            disabled={s === task.status}
                            onClick={() => handleStatus(task, s)}
                          >
                            {TASK_STATUS_LABELS[s]}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Editar">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openEdit(task)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {(privileged || task.ownerId === user?.id) && (
                        <Menu withinPortal position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              color="red"
                              leftSection={<IconArchive size={16} />}
                              onClick={() => confirmArchive(task)}
                            >
                              Archivar
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="xl">
                      No hay tareas para mostrar.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <TaskModal
        opened={modalOpened}
        onClose={modal.close}
        task={editingTask}
      />
    </Stack>
  );
}
