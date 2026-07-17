import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, {
  type DateClickArg,
} from '@fullcalendar/interaction';
import type {
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import {
  Alert,
  Card,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import type { Task } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useEditTask, useTasks } from '@/hooks/useTasks';
import { useUserNames } from '@/hooks/useUsers';
import { colorForUser } from '@/hooks/userColors';
import { TaskModal } from '@/components/TaskModal';
import { UserColorLegend } from '@/components/UserColorLegend';
import '@/calendar.css';

export function CalendarPage() {
  const { privileged } = useAuth();
  const { data: tasks, isLoading, isError } = useTasks();
  const names = useUserNames();
  const editTask = useEditTask();

  const [colorByAssignee, setColorByAssignee] = useState(true);
  const [modalOpened, modal] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  // Tasks are colored by the person responsible so a privileged user can tell at
  // a glance whose work is whose. Which person — assignee or owner — is toggle-
  // able; assignee is the default since that is who will do the task.
  const events = useMemo<EventInput[]>(() => {
    return (tasks ?? [])
      .filter((task) => task.dueDate)
      .map((task) => {
        const personId = colorByAssignee ? task.assigneeId : task.ownerId;
        const color = colorForUser(personId);
        return {
          id: task.id,
          title: task.title,
          start: task.dueDate!,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { task },
        };
      });
  }, [tasks, colorByAssignee]);

  const handleDateClick = (arg: DateClickArg) => {
    setEditingTask(null);
    setDefaultDate(arg.dateStr);
    modal.open();
  };

  const handleEventClick = (arg: EventClickArg) => {
    const task = arg.event.extendedProps.task as Task;
    setEditingTask(task);
    setDefaultDate(null);
    modal.open();
  };

  const handleEventDrop = async (arg: EventDropArg) => {
    const task = arg.event.extendedProps.task as Task;
    const newDate = arg.event.startStr;
    try {
      await editTask.mutateAsync({ id: task.id, input: { dueDate: newDate } });
      notifications.show({
        color: 'green',
        message: `"${task.title}" movida al ${newDate}.`,
      });
    } catch {
      arg.revert();
      notifications.show({
        color: 'red',
        message: 'No se pudo reprogramar la tarea.',
      });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Calendario</Title>
          <Text c="dimmed" size="sm">
            {privileged
              ? 'Todas las tareas del equipo, coloreadas por persona.'
              : 'Tus tareas por fecha de vencimiento.'}
          </Text>
        </div>
        {privileged && (
          <Switch
            checked={colorByAssignee}
            onChange={(e) => setColorByAssignee(e.currentTarget.checked)}
            label="Colorear por responsable"
          />
        )}
      </Group>

      {isError && (
        <Alert color="red" icon={<IconInfoCircle />}>
          No se pudieron cargar las tareas.
        </Alert>
      )}

      {privileged && (
        <UserColorLegend
          tasks={tasks ?? []}
          names={names}
          byAssignee={colorByAssignee}
        />
      )}

      <Card withBorder padding="md">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          locale="es"
          firstDay={1}
          height="auto"
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
          }}
          events={events}
          editable
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
        />
      </Card>

      <TaskModal
        opened={modalOpened}
        onClose={modal.close}
        task={editingTask}
        defaultDate={defaultDate}
      />
    </Stack>
  );
}
