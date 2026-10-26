import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { PageHeader } from "@/components/PageHeader";
import PontoTab from "@/pages/rh/PontoTab";
import FolhaTab from "@/pages/rh/FolhaTab";
import RecrutamentoTab from "@/pages/rh/RecrutamentoTab";

export default function RhPage() {
  const [aba, setAba] = useState(0);

  return (
    <Box>
      <PageHeader
        titulo="Recursos Humanos"
        descricao="Ponto eletrônico, folha de pagamento e recrutamento."
      />

      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Ponto" />
        <Tab label="Folha de pagamento" />
        <Tab label="Recrutamento" />
      </Tabs>

      {aba === 0 && <PontoTab />}
      {aba === 1 && <FolhaTab />}
      {aba === 2 && <RecrutamentoTab />}
    </Box>
  );
}
