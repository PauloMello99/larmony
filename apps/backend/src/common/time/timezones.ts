/**
 * Lista canônica de fusos IANA suportados (M12) — fonte da verdade para a
 * validação de `households.timezone`. Deriva do ICU do runtime
 * (`Intl.supportedValuesOf`), então acompanha o tz database sem lista
 * hardcoded. Guardar um fuso inválido faria date-fns-tz lançar no tick do
 * cron, então a entrada é validada estritamente contra esta lista.
 */
// `Intl.supportedValuesOf` existe no Node 22 (runtime), mas ainda não está na
// lib de tipos do TS — cast pontual em vez de bumpar o target de todo o build.
const intlWithSupported = Intl as unknown as {
  supportedValuesOf(key: "timeZone"): string[];
};

export const IANA_TIMEZONES: string[] = intlWithSupported.supportedValuesOf("timeZone");

const TIMEZONE_SET = new Set(IANA_TIMEZONES);

export function isValidTimeZone(value: string): boolean {
  return TIMEZONE_SET.has(value);
}
