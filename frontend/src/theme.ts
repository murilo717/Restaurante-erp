import { createTheme } from "@mui/material/styles";

// Tema do ERP: paleta sóbria com destaque laranja (restaurante).
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#c2410c" },
    secondary: { main: "#0f766e" },
    background: { default: "#f4f5f7" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});
