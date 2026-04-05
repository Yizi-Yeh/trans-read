"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#C9B59C",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#D9CFC7",
      contrastText: "#5B5045"
    },
    text: {
      primary: "#3F4B35",
      secondary: "#7A6F64"
    },
    background: {
      default: "#F9F8F6",
      paper: "#FFFBF1"
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
          border: "1px solid rgba(201, 181, 156, 0.28)",
          boxShadow: "none",
          fontWeight: 700,
          fontSize: "1rem",
          lineHeight: 1.4
        },
        contained: {
          backgroundColor: "#C9B59C",
          borderColor: "#C9B59C",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#B7A288",
            borderColor: "#B7A288"
          },
          "&.Mui-disabled": {
            backgroundColor: "#EDE7E1",
            borderColor: "#DDD3CA",
            color: "#9A8A7B"
          }
        },
        outlined: {
          borderColor: "rgba(201, 181, 156, 0.45)",
          color: "#C9B59C",
          backgroundColor: "#ffffff"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#ffffff",
          borderColor: "rgba(201, 181, 156, 0.16)",
          boxShadow: "0 8px 24px rgba(34, 38, 43, 0.04)"
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: "rgba(201, 181, 156, 0.28)",
          backgroundColor: "#D9CFC7",
          color: "#6A5F54",
          fontSize: "1rem"
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#C9B59C"
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#7A6F64",
          fontSize: "1rem",
          lineHeight: 1.4,
          minHeight: 48,
          "&.Mui-selected": {
            color: "#C9B59C"
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
