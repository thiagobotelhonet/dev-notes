---
status: substituída
superseded_by: 0010-tauri-desktop-shell.md (ADR-001): app desktop local, sem backend nem sessão
date: 2026-09-20
---

# Sessão por cookie do backend, com CSRF em memória

## Contexto

- Guardar token no `localStorage` deixa o roubo de sessão a um XSS de
  distância, e o valor guardado pode ser editado por quem usa o navegador.
- O template não tem servidor próprio: não há onde validar sessão no
  front-end.

## Decisão

A API cria e valida um cookie `HttpOnly`. O token CSRF vem no corpo do
`GET /session`, fica só em memória e é reenviado no cabeçalho das gravações. O
front-end não guarda nada de sessão em armazenamento do navegador (SEG-01).

## Consequências

- Depois de uma recarga, a sessão é recuperada por uma chamada, não por leitura
  local.
- A guarda de rota em `_app.tsx` é conveniência de navegação; a autorização
  continua sendo da API a cada recurso e operação (SEG-02, SEG-03).
- 401 em recurso privado derruba a sessão; no endpoint de login, não, para que
  senha errada vire mensagem no formulário (API-10).
- OIDC, SSO, MFA e renovação são decisões do backend. O módulo `auth` é o ponto
  de adaptação; o template não inventa refresh token.
