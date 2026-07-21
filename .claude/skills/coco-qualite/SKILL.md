---
name: coco-qualite
description: >
  Lance l'agent qualite-coco : bilan d'exploitation du front desk Coco — qualité des
  réponses IA, escalades, propositions d'amélioration des prompts. Utiliser quand Cyril
  veut un bilan ou analyser un raté du bot, ou tape /coco-qualite [période ou cas].
---

# /coco-qualite — bilan qualité de Coco front desk

Réponds à la demande : `$ARGUMENTS`

1. Lis `.claude/agents/qualite-coco.md`, `CLAUDE.md` et `src/prompts/index.ts`.
2. Si l'agent `qualite-coco` est disponible comme sous-agent, délègue-lui via le tool
   Agent (subagent_type: `qualite-coco`). Sinon, applique toi-même ses instructions.
3. Structure fixe, en français, une page max :
   - 💬 Activité récente — volume, intents, escalades (plainte/urgence/confiance faible)
   - ✅ Ce qui marche / ⚠️ Les ratés repérés (exemples anonymisés)
   - 🛠️ Améliorations proposées (prompts, connaissance) — à faire appliquer par
     `dev-coco` après validation
   - ✅ Actions recommandées (3 max)

L'agent observe et propose — il ne répond jamais lui-même à un client.
