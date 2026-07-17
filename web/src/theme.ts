import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: 'md',
  // Open overlays instantly. Mantine's enter/exit transitions depend on
  // transitionend events, which can stall in some rendering environments and
  // leave a modal/drawer/menu mounted but empty; a zero-duration transition
  // sidesteps that and makes overlays deterministic.
  components: {
    Modal: { defaultProps: { transitionProps: { duration: 0 } } },
    Drawer: { defaultProps: { transitionProps: { duration: 0 } } },
    Menu: { defaultProps: { transitionProps: { duration: 0 } } },
  },
});
