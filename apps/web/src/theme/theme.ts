import { createTheme } from '@mui/material/styles';

export const universityColors = {
  navy: '#073763',
  navyDark: '#042746',
  navyLight: '#155A91',

  gold: '#D5AA55',
  goldDark: '#AA7D2E',
  goldLight: '#FBF3E2',

  background: '#F5F7FA',
  paper: '#FFFFFF',

  text: '#172B3A',
  textSecondary: '#687987',

  border: '#E1E7EC',
  softBlue: '#EDF4FA',
  softGold: '#FCF7ED',
};

export const theme = createTheme({
  direction: 'rtl',

  palette: {
    mode: 'light',

    primary: {
      main: universityColors.navy,
      dark: universityColors.navyDark,
      light: universityColors.navyLight,
      contrastText: '#FFFFFF',
    },

    secondary: {
      main: universityColors.gold,
      dark: universityColors.goldDark,
      light: universityColors.goldLight,
      contrastText: universityColors.navyDark,
    },

    background: {
      default: universityColors.background,
      paper: universityColors.paper,
    },

    text: {
      primary: universityColors.text,
      secondary: universityColors.textSecondary,
    },

    divider: universityColors.border,

    success: {
      main: '#2F7D5A',
    },

    warning: {
      main: '#C28A2E',
    },

    error: {
      main: '#C84D57',
    },

    info: {
      main: '#3478B8',
    },
  },

  typography: {
    fontFamily:
      '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',

    h1: {
      fontWeight: 700,
    },

    h2: {
      fontWeight: 700,
    },

    h3: {
      fontWeight: 700,
    },

    h4: {
      fontWeight: 700,
      color: universityColors.navyDark,
    },

    h5: {
      fontWeight: 700,
      color: universityColors.navyDark,
    },

    h6: {
      fontWeight: 600,
      color: universityColors.navyDark,
    },

    body1: {
      lineHeight: 1.8,
    },

    body2: {
      lineHeight: 1.75,
    },

    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 12,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          direction: 'rtl',
        },

        body: {
          direction: 'rtl',
          backgroundColor: universityColors.background,
          color: universityColors.text,
        },

        '#root': {
          minHeight: '100vh',
          direction: 'rtl',
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: 9,
          paddingInline: 18,
          fontWeight: 600,
          textTransform: 'none',
        },

        contained: {
          boxShadow: 'none',

          '&:hover': {
            boxShadow: 'none',
          },
        },

        outlined: {
          borderColor: universityColors.border,

          '&:hover': {
            borderColor: universityColors.navy,
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${universityColors.border}`,
          boxShadow: '0 2px 10px rgba(5, 39, 70, 0.035)',
          backgroundImage: 'none',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: '#FFFFFF',

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: universityColors.border,
          },

          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#A9B8C5',
          },

          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: universityColors.navy,
            borderWidth: 1,
          },
        },

        input: {
          textAlign: 'right',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          transformOrigin: 'top right',
        },
      },
    },

    MuiTable: {
      styleOverrides: {
        root: {
          direction: 'rtl',
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          textAlign: 'right',
          borderColor: universityColors.border,
        },

        head: {
          fontSize: 12.5,
          fontWeight: 700,
          color: universityColors.navyDark,
          backgroundColor: '#F7F9FB',
        },

        body: {
          fontSize: 12.5,
          color: universityColors.text,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          height: 27,
          borderRadius: 7,
          fontWeight: 600,
          fontSize: 11,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily:
            '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
          fontSize: 11,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${universityColors.border}`,
          boxShadow: '0 10px 35px rgba(5, 39, 70, 0.12)',
        },
      },
    },
  },
});