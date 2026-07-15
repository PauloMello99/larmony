import { SUPPORTED_APP_LOCALES } from "../../../common/i18n/app-locale";
import { mailMessages } from "./mail-messages";

describe("mailMessages", () => {
  it("todos os 7 locales têm todas as mensagens não-vazias", () => {
    for (const locale of SUPPORTED_APP_LOCALES) {
      const m = mailMessages(locale);

      expect(m.layout.lang).toBe(locale);
      expect(m.layout.footerAccount.length).toBeGreaterThan(0);
      expect(m.layout.footerHelp.length).toBeGreaterThan(0);
      expect(m.layout.footerPrivacy.length).toBeGreaterThan(0);

      expect(m.welcome.subject.length).toBeGreaterThan(0);
      expect(m.welcome.heading("Paulo")).toContain("Paulo");
      expect(m.welcome.body.length).toBeGreaterThan(0);
      expect(m.welcome.cta.length).toBeGreaterThan(0);
      expect(m.welcome.footNote.length).toBeGreaterThan(0);

      expect(m.invite.subject("Casa X")).toContain("Casa X");
      expect(m.invite.preview("Casa X")).toContain("Casa X");
      expect(m.invite.heading.length).toBeGreaterThan(0);
      expect((m.invite.bodyBefore + m.invite.bodyAfter).length).toBeGreaterThan(0);
      expect(m.invite.cta.length).toBeGreaterThan(0);
      expect(m.invite.expires.length).toBeGreaterThan(0);

      expect(m.passwordReset.subject.length).toBeGreaterThan(0);
      expect(m.passwordReset.greeting("Ana")).toContain("Ana");
      expect(m.passwordReset.greeting(undefined).length).toBeGreaterThan(0);
      expect(m.passwordReset.body.length).toBeGreaterThan(0);
      expect(m.passwordReset.ignoreNote.length).toBeGreaterThan(0);

      expect(m.copyLink.length).toBeGreaterThan(0);
      expect(m.notification.defaultActionLabel.length).toBeGreaterThan(0);
    }
  });

  it("copy do welcome/convite é do Larmony (fix da copy stale ink/tattoo)", () => {
    const pt = mailMessages("pt-BR");
    expect(pt.welcome.body).toContain("finanças do lar");
    expect(pt.welcome.body).not.toMatch(/estúdio|tatuagem|estoque/i);
    expect(pt.welcome.footNote).not.toMatch(/tatuagem/i);
    expect(pt.invite.bodyAfter).toContain("Larmony");
    expect(pt.invite.bodyAfter).not.toMatch(/Ink|estúdio/i);
  });

  it("locale legado/inválido normaliza (en→en-US) e cai no fallback pt-BR", () => {
    expect(mailMessages("en").welcome.subject).toBe("Welcome to Larmony");
    expect(mailMessages("es").welcome.subject).toBe("Bienvenido a Larmony");
    expect(mailMessages("xx-XX").welcome.subject).toBe("Bem-vindo ao Larmony");
    expect(mailMessages(null).welcome.subject).toBe("Bem-vindo ao Larmony");
  });

  it("idioma certo por locale (subject do welcome)", () => {
    expect(mailMessages("pt-BR").welcome.subject).toContain("Bem-vindo");
    expect(mailMessages("en-US").welcome.subject).toContain("Welcome");
    expect(mailMessages("es-ES").welcome.subject).toContain("Bienvenido");
    expect(mailMessages("zh-CN").welcome.subject).toContain("欢迎");
    expect(mailMessages("de-DE").welcome.subject).toContain("Willkommen");
    expect(mailMessages("fr-FR").welcome.subject).toContain("Bienvenue");
    expect(mailMessages("ja-JP").welcome.subject).toContain("ようこそ");
  });
});
