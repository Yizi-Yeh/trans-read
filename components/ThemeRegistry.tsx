"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4F86F7",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#DCE8FF",
      contrastText: "#2A3E67"
    },
    text: {
      primary: "#25324D",
      secondary: "#62708D"
    },
    background: {
      default: "#F3F7FD",
      paper: "#ffffff"
    }
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontSize: 16,
    fontFamily:
      '"Hiragino Sans", "PingFang TC", "Noto Sans JP", "Noto Sans TC", "Yu Gothic", sans-serif',
    body1: {
      fontSize: "1rem",
      lineHeight: 1.8,
      letterSpacing: "0.01em"
    },
    body2: {
      fontSize: "1rem",
      lineHeight: 1.75,
      letterSpacing: "0.01em"
    },
    button: {
      fontSize: "1rem",
      lineHeight: 1.4,
      letterSpacing: "0.01em",
      textTransform: "none"
    },
    subtitle1: {
      fontSize: "1rem",
      lineHeight: 1.7
    },
    subtitle2: {
      fontSize: "1rem",
      lineHeight: 1.65
    },
    caption: {
      fontSize: "1rem",
      lineHeight: 1.6
    },
    overline: {
      fontSize: "0.95rem",
      lineHeight: 1.5,
      letterSpacing: "0.06em"
    },
    h4: {
      fontWeight: 800,
      lineHeight: 1.35,
      letterSpacing: "-0.01em"
    },
    h5: {
      fontWeight: 800,
      lineHeight: 1.4,
      letterSpacing: "-0.01em"
    },
    h6: {
      fontWeight: 800,
      lineHeight: 1.45
    },
    h3: {
      fontWeight: 800,
      lineHeight: 1.3,
      letterSpacing: "-0.02em"
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: "1px solid rgba(79, 134, 247, 0.26)",
          boxShadow: "none",
          fontWeight: 700,
          fontSize: "1rem",
          lineHeight: 1.4
        },
        contained: {
          backgroundColor: "#4F86F7",
          borderColor: "#4F86F7",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#3E74E6",
            borderColor: "#3E74E6"
          },
          "&.Mui-disabled": {
            backgroundColor: "#e8eefb",
            borderColor: "#d2def6",
            color: "#91a1c2"
          }
        },
        outlined: {
          borderColor: "rgba(79, 134, 247, 0.36)",
          color: "#4F86F7",
          backgroundColor: "#ffffff"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#ffffff",
          borderColor: "rgba(79, 134, 247, 0.14)",
          boxShadow: "0 8px 24px rgba(34, 38, 43, 0.04)"
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: "rgba(79, 134, 247, 0.22)",
          backgroundColor: "#edf3ff",
          color: "#5f6f8e",
          fontSize: "1rem"
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#4F86F7"
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#62708D",
          fontSize: "1rem",
          lineHeight: 1.4,
          minHeight: 48,
          "&.Mui-selected": {
            color: "#4F86F7"
          }
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: "1rem",
          lineHeight: 1.7
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "1rem"
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: "0.95rem",
          lineHeight: 1.6
        }
      }
    }
  }
});

export function ThemeRegistry({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
