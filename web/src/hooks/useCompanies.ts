import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  changeCompanyStatus,
  createCompany,
  createCompanyStatus,
  deleteCompany,
  editCompany,
  getCompany,
  linkContactToCompany,
  listCompanies,
  listCompanyStatuses,
} from '@/api/companies';
import type {
  CreateCompanyInput,
  EditCompanyInput,
  LinkContactInput,
} from '@/api/types';
import { useAuth } from '@/auth/AuthContext';

const COMPANIES_KEY = ['companies'] as const;
const COMPANY_STATUSES_KEY = ['company-statuses'] as const;

export function useCompanies() {
  return useQuery({ queryKey: COMPANIES_KEY, queryFn: listCompanies });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: [...COMPANIES_KEY, id],
    queryFn: () => getCompany(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateCompanies() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: COMPANIES_KEY });
}

export function useCreateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: invalidate,
  });
}

export function useEditCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditCompanyInput }) =>
      editCompany(id, input),
    onSuccess: invalidate,
  });
}

export function useChangeCompanyStatus() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      changeCompanyStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useLinkContact() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({
      companyId,
      input,
    }: {
      companyId: string;
      input: LinkContactInput;
    }) => linkContactToCompany(companyId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: invalidate,
  });
}

/** CREATOR-only catalog of status definitions; disabled for everyone else. */
export function useCompanyStatuses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: COMPANY_STATUSES_KEY,
    queryFn: listCompanyStatuses,
    enabled: user?.role === 'CREATOR',
  });
}

export function useCreateCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (description: string) => createCompanyStatus(description),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: COMPANY_STATUSES_KEY }),
  });
}

/**
 * The status descriptions a privileged actor may assign to a company.
 *
 * A CREATOR gets the full catalog (GET /company-statuses). An ADMIN cannot read
 * that CREATOR-only catalog, so we fall back to the distinct statuses already in
 * use across companies — a safe subset, since every one of those is guaranteed
 * to exist in the lookup and won't 404 on assignment. The company's current
 * status is always included so it never disappears from its own picker.
 */
export function useAssignableStatuses(currentStatus?: string | null): string[] {
  const { user } = useAuth();
  const { data: catalog } = useCompanyStatuses();
  const { data: companies } = useCompanies();

  return useMemo(() => {
    const set = new Set<string>();
    if (user?.role === 'CREATOR') {
      for (const s of catalog ?? []) {
        set.add(s.description);
      }
    } else {
      for (const c of companies ?? []) {
        if (c.status) {
          set.add(c.status);
        }
      }
    }
    if (currentStatus) {
      set.add(currentStatus);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [user?.role, catalog, companies, currentStatus]);
}
