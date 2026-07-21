---
name: coco-onboarding
description: >
  Lance l'agent onboarding-coco : installation du front desk Coco chez un nouveau client —
  base de connaissance, env vars, Twilio/Gmail, checklist go-live. Utiliser quand Cyril
  prépare ou déroule l'installation d'un client, ou tape /coco-onboarding [client].
---

# /coco-onboarding — installer Coco chez un client

Réponds à la demande : `$ARGUMENTS`

1. Lis `.claude/agents/onboarding-coco.md`, `CLAUDE.md` et `.env.example`.
2. Si l'agent `onboarding-coco` est disponible comme sous-agent, délègue-lui via le tool
   Agent (subagent_type: `onboarding-coco`). Sinon, applique toi-même ses instructions.
3. Workflow : produire (ou dérouler) la checklist d'installation — intake client, business
   en base, connaissance sur `/knowledge`, env vars, Twilio WhatsApp, Gmail, tests de bout
   en bout, go-live — en marquant chaque étape ✅ / ⏳ / `[À COMPLÉTER PAR CYRIL]`.

Aucune configuration en production ni contact client sans validation de Cyril ; jamais de
secrets en clair dans un document.
