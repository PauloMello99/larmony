import { normalizeAppLocale, type AppLocale } from "../../../../common/i18n/app-locale";

/**
 * i18n das notificações (backend) — render no envio, no idioma do destinatário
 * (`users.locale`). A lista de locales e a normalização (tags legadas
 * `en`→`en-US`/`es`→`es-ES`, match por idioma-base) vivem em
 * `common/i18n/app-locale.ts`, compartilhadas com o catálogo de e-mail. Moeda é
 * sempre BRL (ADR-0017) — só a *formatação* muda por locale.
 */
export type NotificationLocale = AppLocale;

/** Garante um locale suportado (delegando à normalização compartilhada). */
export function normalizeLocale(value: string | null | undefined): NotificationLocale {
  return normalizeAppLocale(value);
}

export interface NotificationFormatters {
  /** Centavos → moeda BRL (sempre pt-BR, ex.: "R$ 290,33"). */
  brl(cents: number): string;
  /** Mês 1-12 → nome do mês capitalizado no locale (ex.: "Julho" / "July"). */
  monthName(month: number): string;
  /** ISO yyyy-MM-dd → data por extenso no locale (ex.: "11 de julho de 2026"). */
  date(iso: string): string;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/**
 * Formatadores presos a um locale — de-duplica o `toLocaleString` inline. A
 * MOEDA fica fixa em pt-BR/BRL (mesma decisão do frontend `formatCentsToBRL`:
 * o Larmony é um produto brasileiro, moeda sempre "R$ 1.234,56"); só datas e
 * nomes de mês seguem o locale do destinatário.
 */
export function makeFormatters(locale: NotificationLocale): NotificationFormatters {
  return {
    brl(cents: number): string {
      return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },
    monthName(month: number): string {
      // Dia 1 de um ano fixo — só o nome do mês importa.
      const name = new Date(2000, month - 1, 1).toLocaleDateString(locale, { month: "long" });
      return capitalize(name);
    },
    date(iso: string): string {
      const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
      return new Date(y, m - 1, d).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
  };
}
