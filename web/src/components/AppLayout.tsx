import { NavLink as RouterNavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppShell,
  Avatar,
  Badge,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAddressBook,
  IconBuilding,
  IconActivity,
  IconCalendar,
  IconChecklist,
  IconInbox,
  IconLayoutColumns,
  IconLayoutDashboard,
  IconLogout,
  IconTags,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import { usePendingAssignmentsCount } from '@/hooks/useAssignments';
import { ROLE_LABELS } from '@/labels';

interface NavItem {
  to: string;
  label: string;
  icon: typeof IconCalendar;
  privileged?: boolean;
  creatorOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel', icon: IconLayoutDashboard },
  { to: '/calendar', label: 'Calendario', icon: IconCalendar },
  { to: '/tasks', label: 'Tareas', icon: IconChecklist },
  { to: '/board', label: 'Tablero', icon: IconLayoutColumns },
  { to: '/inbox', label: 'Bandeja', icon: IconInbox },
  { to: '/contacts', label: 'Contactos', icon: IconAddressBook },
  { to: '/companies', label: 'Empresas', icon: IconBuilding },
  { to: '/users', label: 'Usuarios', icon: IconUsers, privileged: true },
  {
    to: '/activity',
    label: 'Actividad',
    icon: IconActivity,
    privileged: true,
  },
  {
    to: '/company-statuses',
    label: 'Estados de empresa',
    icon: IconTags,
    creatorOnly: true,
  },
];

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, privileged, logout } = useAuth();
  const pendingCount = usePendingAssignmentsCount();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>Personal CRM</Title>
          </Group>

          {user && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="indigo" radius="xl" size={32}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div style={{ lineHeight: 1.1 }}>
                      <Text size="sm" fw={600}>
                        {user.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {ROLE_LABELS[user.role]}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate('/profile')}
                >
                  Mi perfil
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          {NAV_ITEMS.filter(
            (item) =>
              (!item.privileged || privileged) &&
              (!item.creatorOnly || user?.role === 'CREATOR'),
          ).map(
            (item) => (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                end={item.to === '/'}
                label={item.label}
                leftSection={<item.icon size={18} />}
                rightSection={
                  item.to === '/inbox' && pendingCount > 0 ? (
                    <Badge size="sm" circle color="orange">
                      {pendingCount}
                    </Badge>
                  ) : undefined
                }
                onClick={close}
              />
            ),
          )}
        </AppShell.Section>
        {user && (
          <AppShell.Section>
            <Badge variant="light" color="indigo" fullWidth>
              {ROLE_LABELS[user.role]}
            </Badge>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
