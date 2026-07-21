---
name: coco-vente
description: >
  Lance l'agent commercial-coco : matériel de vente et prospection du front desk Coco à
  Koh Samui — pitchs, démos, emails d'approche, suivi des prospects. Utiliser quand Cyril
  veut vendre Coco ou tape /coco-vente [segment ou cible].
---

# /coco-vente — vendre Coco front desk

Réponds à la demande : `$ARGUMENTS`

1. Lis `.claude/agents/commercial-coco.md` et `CLAUDE.md`.
2. Si l'agent `commercial-coco` est disponible comme sous-agent, délègue-lui via le tool
   Agent (subagent_type: `commercial-coco`). Sinon, applique toi-même ses instructions.
3. Workflow selon la demande : matériel de vente (pitch, script de démo, email d'approche
   FR/EN) ou point prospection (cibles vérifiées, état, relances dues) → livrables en
   brouillon à valider par Cyril.

Brouillons uniquement — aucun envoi ; tarifs et références = `[À COMPLÉTER PAR CYRIL]` ;
ne pas confondre avec coco2 (concierge touristique).
