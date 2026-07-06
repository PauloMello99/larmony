const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function formatCentsToBRL(cents: number): string {
  return BRL_FORMATTER.format(cents / 100)
}

/** Extrai os dígitos de uma string mascarada (ex: "R$ 1.234,56") e retorna centavos. */
export function parseBRLInputToCents(input: string): number {
  const digits = input.replace(/\D/g, "")
  return digits ? parseInt(digits, 10) : 0
}
