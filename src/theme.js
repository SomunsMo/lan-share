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
  typography: {
    fontFamily: '"Alibaba PuHuiTi 3.0","PingFang SC","Microsoft YaHei",system-ui,sans-serif',
    fontSize: 15,
  },
  components: {
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
