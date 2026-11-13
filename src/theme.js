import { createTheme } from '@mui/material';

const theme = createTheme({
  cssVariables: true,
  colorSchemeSelector: "data-mui-color-scheme",
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#004ac6', contrastText: '#ffffff' },
        secondary: { main: '#505f76' },
        error: { main: '#ba1a1a' },
        success: { main: '#2e7d32' },
        background: { default: '#faf8ff', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#b4c5ff', contrastText: '#003ea8' },
        secondary: { main: '#b7c8e1' },
        error: { main: '#ffb4ab' },
        success: { main: '#2e7d32' },
        background: { default: '#0f172a', paper: '#1e293b' },
      },
    },
  },
  shape: { borderRadius: 8 },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 180,
      short: 200,
      standard: 260,
      complex: 360,
      enteringScreen: 260,
      leavingScreen: 200,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.2, 0, 0, 1)',
      easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  typography: {
    fontFamily: '"Alibaba PuHuiTi 3.0","PingFang SC","Microsoft YaHei",system-ui,sans-serif',
    fontSize: 15,
  },
  components: {
    MuiDialog: {
      defaultProps: {
        transitionDuration: { enter: 260, exit: 200 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          transition: 'background-color 160ms cubic-bezier(0.2, 0, 0, 1)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiInput: {
      styleOverrides: {
        input: {
          padding: '4px',
          '&.MuiInput-inputSizeSmall': {
            padding: '4px',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          border: 'var(--glass-border)',
        },
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)',
          },
        },
      },
    },
  },
});

export default theme;
