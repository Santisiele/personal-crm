import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { listActivities, listAllActivity, logActivity } from '@/api/activities';
import type { LogActivityInput } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';

const activitiesKey = (taskId: string) => ['activities', taskId] as const;

/** The global activity feed; enabled only for privileged actors (ADMIN/CREATOR). */
export function useAllActivity() {
  const { privileged } = useAuth();
  return useQuery({
    queryKey: ['activities', 'all'],
    queryFn: listAllActivity,
    enabled: privileged,
  });
}

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
