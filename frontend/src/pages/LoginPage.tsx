import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import { useAuth } from "@/auth/AuthContext";
import { extrairMensagemErro } from "@/api/client";

export default function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await entrar(login, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }} elevation={6}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2} alignItems="center" mb={2}>
            <RestaurantIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5" fontWeight={700}>
              ERP Restaurante
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Entre com suas credenciais
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {erro && <Alert severity="error">{erro}</Alert>}
              <TextField
                label="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoFocus
                required
                fullWidth
                autoComplete="username"
              />
              <TextField
                label="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={carregando}
                startIcon={
                  carregando ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
              >
                {carregando ? "Entrando..." : "Entrar"}
              </Button>

              <Typography variant="body2" textAlign="center">
                Não tem conta?{" "}
                <Link component={RouterLink} to="/cadastro">
                  Criar conta
                </Link>
              </Typography>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
