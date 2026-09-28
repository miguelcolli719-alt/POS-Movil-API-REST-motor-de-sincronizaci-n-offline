# AGENTS.md

## Reglas de seguridad — OBLIGATORIAS

- NUNCA leas, abras, imprimas ni cites el contenido de `.env` o `.env.*`.
- NUNCA ejecutes `cat .env`, `type .env`, `grep`/`rg` sobre archivos `.env`.
- Para conocer las variables esperadas, usa `.env.example` o `src/config/env.schema.js`, nunca el `.env` real.
- Si necesitas un valor real para probar algo, pídeselo al usuario directamente.