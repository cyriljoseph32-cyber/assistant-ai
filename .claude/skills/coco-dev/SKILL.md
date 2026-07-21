---
name: coco-dev
description: >
  Lance l'agent dev-coco : modifications de code du front desk Coco (console Next.js,
  pipeline IA, CRM) avec build + typecheck avant tout commit. Utiliser quand Cyril demande
  un changement de code sur assistant-ai ou tape /coco-dev [demande].
---

# /coco-dev — développement de Coco front desk

Réponds à la demande : `$ARGUMENTS`

1. Lis `.claude/agents/dev-coco.md` et `CLAUDE.md`.
2. Si l'agent `dev-coco` est disponible comme sous-agent, délègue-lui via le tool Agent
   (subagent_type: `dev-coco`). Sinon, applique toi-même ses instructions.
3. Workflow : branche de travail → modification (archi app → services → lib respectée) →
   `npm run build` && `npm run typecheck` → commit clair → signaler à Cyril ce qui a
   changé (et mettre à jour la mémoire centrale si le changement est significatif).

Jamais de push direct sur `main` ; auth et logging jamais affaiblis.
