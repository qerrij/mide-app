import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#674fb6',
      light: '#8a76d4',
      dark: '#483399',
    },
    secondary: {
      main: '#56b8d1',
      light: '#7dd8f0',
      dark: '#2a9ab3',
    },
    error: {
      main: '#ca0ec0',
      light: '#f541ec',
      dark: '#950090',
    },
    warning: {
      main: '#6d3f57',
      light: '#9a6a7f',
      dark: '#4c283a',
    },
    info: {
      main: '#2a436d',
      light: '#4a6aa0',
      dark: '#1a2d4a',
    },
    success: {
      main: '#3f1f4b',
      light: '#6a3d7a',
      dark: '#2a0f35',
    },
    background: {
      default: '#f5f3f6',
      paper: '#ffffff',
    },
    text: {
      primary: '#2a0f35',
      secondary: '#4c5454',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: '#2a0f35',
      fontWeight: 600,
    },
    h2: {
      color: '#3f1f4b',
      fontWeight: 600,
    },
    h3: {
      color: '#4c5454',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        containedPrimary: {
          backgroundColor: '#674fb6',
          '&:hover': {
            backgroundColor: '#483399',
          },
        },
        containedSecondary: {
          backgroundColor: '#56b8d1',
          '&:hover': {
            backgroundColor: '#2a9ab3',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a436d',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
        },
      },
    },
  },
});