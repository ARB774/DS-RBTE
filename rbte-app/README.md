# RBTE server modules

This directory contains the first implementation slice for the future Next.js
application: a replaceable AI provider adapter, a deterministic local stub and
test account fixtures.

## AI provider selection

The safe default is `AI_PROVIDER=stub`. It performs no network requests and
needs no secret. To activate OpenAI during deployment, put the following values
in the server-side secret/configuration store:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=<deployment secret>
OPENAI_MODEL=gpt-5.6-terra
```

No provider key is read in the browser or committed to this repository. The
application imports `createAIAdapter()` on the server and depends only on the
`AIModelAdapter` contract. A later provider is added as another implementation
and one factory branch; RBTE data and route logic do not change.

The adapter returns the provider-neutral `AIResponse` required by the RBTE
architecture and rejects any response that does not match that schema. The
OpenAI implementation uses the Responses API with structured output and
`store: false`; RBTE remains responsible for its own dialogue history.

## Test accounts

Definitions are in `src/modules/identity/testing/test-accounts.ts`. They contain
roles and `.test` e-mail addresses, but no password. A seed caller must set both
`RBTE_ENABLE_TEST_ACCOUNTS=true` and `RBTE_TEST_ACCOUNT_PASSWORD`, then provide a
real password hashing function. Seeding is rejected in `NODE_ENV=production`.

## Verification

```powershell
pnpm install
pnpm typecheck
pnpm test
```
