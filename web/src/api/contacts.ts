import { api } from '@/api/client';
import type {
  Contact,
  CreateContactInput,
  EditContactInput,
} from '@/api/types';

export async function listContacts(): Promise<Contact[]> {
  const { data } = await api.get<Contact[]>('/contacts');
  return data;
}

export async function getContact(id: string): Promise<Contact> {
  const { data } = await api.get<Contact>(`/contacts/${id}`);
  return data;
}

export async function createContact(
  input: CreateContactInput,
): Promise<Contact> {
  const { data } = await api.post<Contact>('/contacts', input);
  return data;
}

export async function editContact(
  id: string,
  input: EditContactInput,
): Promise<Contact> {
  const { data } = await api.patch<Contact>(`/contacts/${id}`, input);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}
