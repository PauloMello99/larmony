# ADR-0021 — Adoção do Design System gerado no Claude Design

**Status:** Aceito
**Data:** 2026-07-10

## Contexto

O Larmony não tinha uma identidade visual formalizada além dos tokens de cor
teal já presentes em `globals.css` (identidade THEME-2, 2026-07-05). Não
havia favicon, a landing tinha bugs de acessibilidade visual (namespace SVG
quebrado no dot-grid) e nenhuma tipografia de marca. O usuário gerou um
Design System completo no Claude Design (claude.ai/design) a partir do
código real do repo e exportou um handoff (HTML/CSS/JS + tokens + guidelines)
para implementação.

## Decisão

Adotar o Design System em três fases, todas implementadas em 2026-07-10:

1. **Marca-ícone + favicon**: conceito "1a" (squircle teal, casa branca)
   escolhido entre 12 explorados; gerados favicon/PWA icons a partir de um
   master em sRGB hex (não OKLCH, por risco de incompatibilidade no
   rasterizador).
2. **Landing refeita** na Direção A "Aconchego" (tipografia Sora, nav em
   pílula flutuante, hero 2 colunas com a casa 3D existente, seções
   Tour/FAQ/CTA final novas).
3. **Essência estendida ao app inteiro**: dark-only (tema claro removido),
   Sora global, superfícies "glass" (`backdrop-blur` + fill translúcido) em
   todos os painéis flutuantes (dialog/sheet/popover/dropdown/select/
   tooltip) e no shell (header/sidebar), fundo decorativo sutil
   (`AppBackground`) nos 4 layouts.

O bundle bruto do handoff (pasta `design-system/` na raiz) foi consumido
integralmente pela documentação em `.memory/design-system.md` e depois
removido do repo — não é mantido como artefato versionado.

Decisões deliberadas que **divergem** do que o handoff originalmente
propunha (detalhe completo em `.memory/design-system.md` §Divergências):
- App é dark-only, não light+dark (o handoff documentava os dois temas).
- Sora é global, não landing-only.
- Superfícies glass no app inteiro, não só na landing (o handoff descrevia
  o app como "flat, sem blur, sem gradiente").
- Existe uma marca-ícone separada do wordmark (o handoff dizia
  "never a separate icon mark") — necessária porque o app não tinha
  favicon algum.
- Botões do app continuam `rounded-md` (a pílula é exclusiva da landing).

## Consequências

- `.memory/design-system.md` é agora a fonte de verdade visual do produto;
  `domain-rules.md` (regras 21, 25, 26) mantém a versão "regra de código"
  resumida para consulta rápida durante implementação, com pointer para o
  documento completo.
- Novos componentes/telas devem seguir a receita de superfícies (cards sem
  blur, painéis flutuantes com `bg-popover/85–90 + backdrop-blur-xl`) em vez
  de reinventar uma variação.
- O tema claro foi removido do produto: qualquer trabalho futuro que precise
  dele exige uma nova decisão explícita (não é um simples revert — os tokens
  `:root` viraram os tokens dark; o par claro original ficaria só no bloco
  `.dark` duplicado, hoje idêntico ao `:root`).
- Assets de favicon/PWA e o componente `LogoMark` passam a ser a marca-ícone
  oficial em qualquer superfície que precise de um glifo (aba do browser,
  compartilhamento, PWA).
