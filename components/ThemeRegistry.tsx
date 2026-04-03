"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1a8a80",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#e8f5f2",
      contrastText: "#2b3136"
    },
    text: {
      primary: "#2a2e33",
      secondary: "#707780"
    },
    background: {
      default: "#f5f7f6",
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
          border: "1px solid rgba(26, 138, 128, 0.16)",
          boxShadow: "none",
          fontWeight: 700,
          fontSize: "1rem",
          lineHeight: 1.4
        },
        contained: {
          backgroundColor: "#1a8a80",
          borderColor: "#1a8a80",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#14756d",
            borderColor: "#14756d"
          },
          "&.Mui-disabled": {
            backgroundColor: "#e7efed",
            borderColor: "#d7e3e0",
            color: "#8a9693"
          }
        },
        outlined: {
          borderColor: "rgba(26, 138, 128, 0.22)",
          color: "#1a8a80",
          backgroundColor: "#ffffff"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#ffffff",
          borderColor: "rgba(34, 38, 43, 0.08)",
          boxShadow: "0 8px 24px rgba(34, 38, 43, 0.04)"
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: "rgba(26, 138, 128, 0.12)",
          backgroundColor: "#f8fbfa",
          color: "#49515a",
          fontSize: "1rem"
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#1a8a80"
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#707780",
          fontSize: "1rem",
          lineHeight: 1.4,
          minHeight: 48,
          "&.Mui-selected": {
            color: "#1a8a80"
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
