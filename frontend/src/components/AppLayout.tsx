import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BadgeIcon from "@mui/icons-material/Badge";
import SoupKitchenIcon from "@mui/icons-material/SoupKitchen";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import GroupIcon from "@mui/icons-material/Group";
import WorkIcon from "@mui/icons-material/Work";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import PaymentsIcon from "@mui/icons-material/Payments";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/auth/AuthContext";
import type { Perfil } from "@/api/types";

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  perfis?: Perfil[]; // perfis que enxergam o item (vazio = todos autenticados)
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  {
    label: "Mesas",
    path: "/mesas",
    icon: <TableRestaurantIcon />,
    perfis: ["garcom", "cozinha", "gerente", "supervisor"],
  },
  {
    label: "Pedidos",
    path: "/pedidos",
    icon: <ReceiptLongIcon />,
    perfis: ["garcom", "cozinha", "gerente", "supervisor"],
  },
  {
    label: "Cozinha (KDS)",
    path: "/cozinha",
    icon: <SoupKitchenIcon />,
    perfis: ["cozinha", "gerente", "supervisor"],
  },
  {
    label: "Produção",
    path: "/producao",
    icon: <PrecisionManufacturingIcon />,
    perfis: ["cozinha", "gerente", "supervisor"],
  },
  {
    label: "Estoque",
    path: "/estoque",
    icon: <Inventory2Icon />,
    perfis: ["cozinha", "gerente", "supervisor"],
  },
  {
    label: "Financeiro",
    path: "/financeiro",
    icon: <AccountBalanceWalletIcon />,
    perfis: ["gerente", "supervisor", "auditor"],
  },
  {
    label: "Clientes",
    path: "/clientes",
    icon: <GroupIcon />,
    perfis: ["garcom", "gerente", "supervisor"],
  },
  {
    label: "Pratos",
    path: "/pratos",
    icon: <RestaurantMenuIcon />,
    perfis: ["garcom", "cozinha", "gerente", "supervisor"],
  },
  {
    label: "Pagamentos",
    path: "/pagamentos",
    icon: <PaymentsIcon />,
    perfis: ["garcom", "gerente"],
  },
  {
    label: "Funcionários",
    path: "/funcionarios",
    icon: <BadgeIcon />,
    perfis: ["gerente"],
  },
  {
    label: "RH",
    path: "/rh",
    icon: <WorkIcon />,
    perfis: ["gerente", "supervisor"],
  },
  { label: "Módulos", path: "/modulos", icon: <ViewModuleIcon /> },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sair, temPerfil } = useAuth();

  const itensVisiveis = NAV_ITEMS.filter(
    (item) => !item.perfis || temPerfil(...item.perfis),
  );

  const iniciais = usuario?.login.slice(0, 2).toUpperCase() ?? "??";

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar>
        <Typography variant="h6" noWrap fontWeight={700} color="primary">
          ERP Restaurante
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {itensVisiveis.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={sair}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Gestão do Restaurante
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {usuario?.perfis.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                color="secondary"
                variant="filled"
                sx={{ textTransform: "capitalize" }}
              />
            ))}
            <Avatar sx={{ bgcolor: "secondary.main", width: 34, height: 34 }}>
              {iniciais}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
