import { api } from '@/api/client';
import type {
  Company,
  CompanyStatus,
  CompanyWithContacts,
  CreateCompanyInput,
  EditCompanyInput,
  LinkContactInput,
} from '@/api/types';

export async function listCompanies(): Promise<Company[]> {
  const { data } = await api.get<Company[]>('/companies');
  return data;
}

export async function getCompany(id: string): Promise<CompanyWithContacts> {
  const { data } = await api.get<CompanyWithContacts>(`/companies/${id}`);
  return data;
}

export async function createCompany(
  input: CreateCompanyInput,
): Promise<Company> {
  const { data } = await api.post<Company>('/companies', input);
  return data;
}

export async function editCompany(
  id: string,
  input: EditCompanyInput,
): Promise<Company> {
  const { data } = await api.patch<Company>(`/companies/${id}`, input);
  return data;
}

export async function changeCompanyStatus(
  id: string,
  status: string,
): Promise<Company> {
  const { data } = await api.patch<Company>(`/companies/${id}/status`, {
    status,
  });
  return data;
}

export async function linkContactToCompany(
  companyId: string,
  input: LinkContactInput,
): Promise<void> {
  await api.post(`/companies/${companyId}/contacts`, input);
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/companies/${id}`);
}

/** CREATOR-only: the full catalog of company status definitions. */
export async function listCompanyStatuses(): Promise<CompanyStatus[]> {
  const { data } = await api.get<CompanyStatus[]>('/company-statuses');
  return data;
}

export async function createCompanyStatus(
  description: string,
): Promise<CompanyStatus> {
  const { data } = await api.post<CompanyStatus>('/company-statuses', {
    description,
  });
  return data;
}
