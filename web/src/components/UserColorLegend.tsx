import { useMemo } from 'react';
import { Badge, Group } from '@mantine/core';
import type { Task } from '@/api/types';
import { colorForUser } from '@/hooks/userColors';

interface UserColorLegendProps {
  tasks: Task[];
  names: Map<string, string>;
  byAssignee: boolean;
}

/**
 * Maps the calendar's per-user colors to names, so a privileged viewer can read
 * whose tasks are whose. Only people who actually have a dated task appear.
 */
export function UserColorLegend({
  tasks,
  names,
  byAssignee,
}: UserColorLegendProps) {
  const people = useMemo(() => {
    const ids = new Set<string>();
    for (const task of tasks) {
      if (!task.dueDate) {
        continue;
      }
      const id = byAssignee ? task.assigneeId : task.ownerId;
      if (id) {
        ids.add(id);
      }
    }
    return [...ids];
  }, [tasks, byAssignee]);

  if (people.length === 0) {
    return null;
  }

  return (
    <Group gap="xs">
      {people.map((id) => (
        <Badge
          key={id}
          variant="filled"
          styles={{ root: { backgroundColor: colorForUser(id) } }}
        >
          {names.get(id) ?? `#${id}`}
        </Badge>
      ))}
    </Group>
  );
}
