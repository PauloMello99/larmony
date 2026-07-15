-- i18n 7 idiomas (adendo ADR-0018): normaliza as tags legadas de users.locale
-- para as tags BCP 47 completas usadas pela UI (en -> en-US, es -> es-ES).
-- Rows já em pt-BR (default) não mudam; o backend também normaliza na leitura
-- (notification-locale.ts), então esta migration é saneamento, não pré-requisito.
UPDATE "public"."users" SET "locale" = 'en-US' WHERE "locale" = 'en';--> statement-breakpoint
UPDATE "public"."users" SET "locale" = 'es-ES' WHERE "locale" = 'es';
