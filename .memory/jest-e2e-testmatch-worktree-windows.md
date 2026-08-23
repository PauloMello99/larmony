---
name: jest-e2e-testmatch-worktree-windows
description: pnpm test:e2e (backend) reporta "No tests found" em worktrees sob .claude/worktrees no Windows — workaround e causa
metadata:
  type: feedback
---

Em worktrees do Claude Code no Windows, cujo caminho fica sob
`...\.claude\worktrees\<nome>\...`, `pnpm --filter backend test:e2e` (ou
`jest --config test/jest-e2e.config.js`) reporta **"No tests found"** com
`testMatch: ... - 0 matches` mesmo com os arquivos `*.e2e-spec.ts`
existindo e sendo contados em "N files checked".

**Causa**: o `rootDir` do jest é resolvido via `path.resolve` (separadores
nativos do Windows, `\`), mas o `testMatch` (`<rootDir>/test/**/*.e2e-spec.ts`)
é interpolado misturando esse `rootDir` com separadores `/`. O padrão final
fica com barras invertidas no meio (ex.:
`C:/Repos/.../larmony\.claude\worktrees\...\apps\backend\test/**/*.e2e-spec.ts`)
— `\` dentro de um glob é caractere de escape, não separador, então o
padrão nunca casa com os caminhos reais. Não é bug do projeto nem do meu
código; é um problema de resolução de path do Jest quando o `rootDir`
cai numa árvore com muitos níveis mistos de separador (comum em
worktrees do Claude Code).

**Workaround**: rodar o jest passando `--testMatch` explícito (sobrescreve
o do config) com um glob simples, sempre com `/`:

```bash
cd apps/backend
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --config test/jest-e2e.config.js --runInBand \
  --testMatch "**/nome-do-arquivo.e2e-spec.ts"
```

Pra rodar a suíte e2e inteira nesse ambiente, seria `--testMatch
"**/*.e2e-spec.ts"`. Isso não altera nada do projeto — é só a forma de
invocar localmente quando o caminho de trabalho está sob `.claude/worktrees`.
`pnpm check-types`/`pnpm test` (unit) não são afetados, só o `test:e2e`
(usa `jest-e2e.config.js`, que declara `testMatch` customizado; o jest
config de unit tests usa outro mecanismo/pasta).

Ver também [[larmony-supabase-local-multi-worktree]] — outro gotcha do
mesmo tipo de ambiente (múltiplos worktrees, mesmo `project_id` Supabase).
