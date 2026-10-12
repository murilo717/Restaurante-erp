// Formata valores numéricos como moeda brasileira (BRL).
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// Converte um Date para o formato aceito por <input type="datetime-local">.
export function paraInputDateTimeLocal(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ano = data.getFullYear();
  const mes = pad(data.getMonth() + 1);
  const dia = pad(data.getDate());
  const hora = pad(data.getHours());
  const min = pad(data.getMinutes());
  return `${ano}-${mes}-${dia}T${hora}:${min}`;
}
