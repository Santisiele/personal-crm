import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { listActivities, logActivity } from '@/api/activities';
import type { LogActivityInput } from '@/api/types';

const activitiesKey = (taskId: string) => ['activities', taskId] as const;

export function useActivities(taskId: string | null) {
  return useQuery({
    queryKey: activitiesKey(taskId ?? ''),
    queryFn: () => listActivities(taskId!),
    enabled: Boolean(taskId),
  });
}

export function useLogActivity(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogActivityInput) => logActivity(taskId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: activitiesKey(taskId) }),
  });
}
