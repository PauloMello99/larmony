// Fusos IANA + detecção do fuso do navegador (M12). `supportedValuesOf` existe
// nos navegadores modernos e no Node 22, mas ainda não está na lib de tipos do
// TS — cast pontual.
const intlWithSupported = Intl as unknown as {
  supportedValuesOf(key: "timeZone"): string[]
}

export const IANA_TIMEZONES: string[] = intlWithSupported.supportedValuesOf("timeZone")

/** Fuso do navegador (ex.: "America/Sao_Paulo") — fallback seguro se indisponível. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo"
  } catch {
    return "America/Sao_Paulo"
  }
}

/** Horas 0–23 para o seletor de hora de notificação do lar. */
export const NOTIFICATION_HOURS: number[] = Array.from({ length: 24 }, (_, h) => h)
