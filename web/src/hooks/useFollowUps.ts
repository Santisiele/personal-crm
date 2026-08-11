import { useQuery } from '@tanstack/react-query';
import { listFollowUps } from '@/api/followUps';

export function useFollowUps() {
  return useQuery({ queryKey: ['follow-ups'], queryFn: listFollowUps });
}
