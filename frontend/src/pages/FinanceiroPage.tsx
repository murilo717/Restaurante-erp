import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { PageHeader } from "@/components/PageHeader";
import ContasPagarTab from "@/pages/financeiro/ContasPagarTab";
import ContasReceberTab from "@/pages/financeiro/ContasReceberTab";
import FluxoCaixaTab from "@/pages/financeiro/FluxoCaixaTab";
import FechamentoTab from "@/pages/financeiro/FechamentoTab";

export default function FinanceiroPage() {
  const [aba, setAba] = useState(0);

  return (
    <Box>
      <PageHeader
        titulo="Financeiro"
        descricao="Contas a pagar e receber, fluxo de caixa e fechamento diário."
      />

      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Contas a pagar" />
        <Tab label="Contas a receber" />
        <Tab label="Fluxo de caixa" />
        <Tab label="Fechamento de caixa" />
      </Tabs>

      {aba === 0 && <ContasPagarTab />}
      {aba === 1 && <ContasReceberTab />}
      {aba === 2 && <FluxoCaixaTab />}
      {aba === 3 && <FechamentoTab />}
    </Box>
  );
}
