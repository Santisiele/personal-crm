import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyModal } from '@/components/CompanyModal';

export function CompaniesPage() {
  const { privileged } = useAuth();
  const { data: companies, isLoading } = useCompanies();
  const [opened, modal] = useDisclosure(false);
  const navigate = useNavigate();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Empresas</Title>
          <Text c="dimmed" size="sm">
            Cuentas y su estado comercial.
          </Text>
        </div>
        {privileged && (
          <Button leftSection={<IconPlus size={16} />} onClick={modal.open}>
            Nueva empresa
          </Button>
        )}
      </Group>

      <Card withBorder padding={0}>
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Empresa</Table.Th>
                <Table.Th>Marca</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Estado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(companies ?? []).map((company) => (
                <Table.Tr
                  key={company.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <Table.Td>
                    <Text fw={500}>{company.companyName}</Text>
                    {company.cuit && (
                      <Text size="xs" c="dimmed">
                        CUIT {company.cuit}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{company.brand ?? '—'}</Table.Td>
                  <Table.Td>{company.product ?? '—'}</Table.Td>
                  <Table.Td>
                    {company.status ? (
                      <Badge variant="light">{company.status}</Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {(companies ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="xl">
                      Todavía no hay empresas.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <CompanyModal opened={opened} onClose={modal.close} />
    </Stack>
  );
}
