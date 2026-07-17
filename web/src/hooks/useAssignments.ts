import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  acceptAssignment,
  listAssignmentHistory,
  listMyPendingAssignments,
  rejectAssignment,
} from '@/api/assignments';

const PENDING_KEY = ['assignments', 'pending'] as const;

export function usePendingAssignments() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: listMyPendingAssignments,
  });
}

export function useAssignmentHistory(taskId: string | null) {
  return useQuery({
    queryKey: ['assignments', 'history', taskId],
    queryFn: () => listAssignmentHistory(taskId!),
    enabled: Boolean(taskId),
  });
}

/** The count of pending assignments, for the nav badge. */
export function usePendingAssignmentsCount(): number {
  const { data } = usePendingAssignments();
  return data?.length ?? 0;
}

export function useRespondToAssignment() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: PENDING_KEY });
    // Accepting/rejecting can change what the task lists show.
    void qc.invalidateQueries({ queryKey: ['tasks'] });
  };
  const accept = useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      acceptAssignment(taskId, id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      rejectAssignment(taskId, id),
    onSuccess: invalidate,
  });
  return { accept, reject };
}
