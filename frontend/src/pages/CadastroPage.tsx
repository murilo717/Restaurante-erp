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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { cadastrar } from "@/api/services";
import { extrairMensagemErro } from "@/api/client";

interface Campos {
  nome: string;
  email: string;
  login: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
}

const INICIAL: Campos = {
  nome: "",
  email: "",
  login: "",
  senha: "",
  confirmarSenha: "",
  telefone: "",
};

export default function CadastroPage() {
  const navigate = useNavigate();
  const [campos, setCampos] = useState<Campos>(INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function atualizar<K extends keyof Campos>(campo: K, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
  }

  // Validações no cliente antes de enviar à API.
  function validar(): string | null {
    if (campos.nome.trim().length < 3) {
      return "Informe o nome completo (mínimo 3 caracteres).";
    }
    if (campos.login.trim().length < 3) {
      return "O login deve ter ao menos 3 caracteres.";
    }
    if (campos.login.includes(" ")) {
      return "O login não pode conter espaços.";
    }
    if (campos.senha.length < 8) {
      return "A senha deve ter ao menos 8 caracteres.";
    }
    if (campos.senha !== campos.confirmarSenha) {
      return "As senhas não conferem.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    setCarregando(true);
    try {
      await cadastrar({
        nome: campos.nome.trim(),
        email: campos.email.trim(),
        login: campos.login.trim(),
        senha: campos.senha,
        confirmar_senha: campos.confirmarSenha,
        telefone: campos.telefone.trim() || null,
      });
      setSucesso(
        "Conta criada com sucesso! Redirecionando para o login...",
      );
      setCampos(INICIAL);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
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
        background: "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 480 }} elevation={6}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} alignItems="center" mb={2}>
            <PersonAddIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5" fontWeight={700}>
              Criar conta
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Preencha seus dados para solicitar acesso ao sistema. O acesso
              inicial é básico; um gestor define suas permissões.
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {erro && <Alert severity="error">{erro}</Alert>}
              {sucesso && <Alert severity="success">{sucesso}</Alert>}

              <TextField
                label="Nome completo"
                value={campos.nome}
                onChange={(e) => atualizar("nome", e.target.value)}
                required
                fullWidth
                autoFocus
                autoComplete="name"
              />
              <TextField
                label="E-mail"
                type="email"
                value={campos.email}
                onChange={(e) => atualizar("email", e.target.value)}
                required
                fullWidth
                autoComplete="email"
              />
              <TextField
                label="Login (usuário de acesso)"
                value={campos.login}
                onChange={(e) => atualizar("login", e.target.value)}
                required
                fullWidth
                autoComplete="username"
                helperText="Sem espaços. Será usado para entrar no sistema."
              />
              <TextField
                label="Telefone (opcional)"
                value={campos.telefone}
                onChange={(e) => atualizar("telefone", e.target.value)}
                fullWidth
                autoComplete="tel"
              />
              <TextField
                label="Senha"
                type="password"
                value={campos.senha}
                onChange={(e) => atualizar("senha", e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                helperText="Mínimo de 8 caracteres."
              />
              <TextField
                label="Confirmar senha"
                type="password"
                value={campos.confirmarSenha}
                onChange={(e) => atualizar("confirmarSenha", e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={carregando}
                startIcon={
                  carregando ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <PersonAddIcon />
                  )
                }
              >
                {carregando ? "Cadastrando..." : "Cadastrar"}
              </Button>

              <Typography variant="body2" textAlign="center">
                Já tem conta?{" "}
                <Link component={RouterLink} to="/login">
                  Entrar
                </Link>
              </Typography>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
