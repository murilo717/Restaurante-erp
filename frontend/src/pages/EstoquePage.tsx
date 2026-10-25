import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { PageHeader } from "@/components/PageHeader";
import InsumosTab from "@/pages/estoque/InsumosTab";
import FichaTecnicaTab from "@/pages/estoque/FichaTecnicaTab";
import ComprasTab from "@/pages/estoque/ComprasTab";
import LotesTab from "@/pages/estoque/LotesTab";

export default function EstoquePage() {
  const [aba, setAba] = useState(0);

  return (
    <Box>
      <PageHeader
        titulo="Estoque e Materiais"
        descricao="Insumos, fichas técnicas, compras de fornecedores e controle de lotes."
      />

      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Insumos" />
        <Tab label="Fichas técnicas" />
        <Tab label="Compras" />
        <Tab label="Lotes" />
      </Tabs>

      {aba === 0 && <InsumosTab />}
      {aba === 1 && <FichaTecnicaTab />}
      {aba === 2 && <ComprasTab />}
      {aba === 3 && <LotesTab />}
    </Box>
  );
}
