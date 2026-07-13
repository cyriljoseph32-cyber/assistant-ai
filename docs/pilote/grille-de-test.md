# Grille de test de bout en bout (jeudi)

Envoyer chaque message depuis un **WhatsApp qui n'est pas celui du owner**,
puis vérifier le résultat dans la console. Cocher quand le comportement
observé correspond à l'attendu.

| # | Scénario | Message à envoyer | Attendu côté client | Attendu côté console | OK |
|---|---|---|---|---|---|
| 1 | Question prix | "Hi! How much is the Koh Tao trip for 2 adults?" | Prix exact du Services summary, pas de prix inventé, 1-3 phrases | Message + réponse `ai` dans `/inbox`, lead créé dans `/leads` avec l'intent | ☐ |
| 2 | Résa complète | "I'd like to book the Angthong trip tomorrow, 2 people, pickup at Ibis Bophut" | Récap des détails + « the team will confirm » (jamais de confirmation ferme) | Booking dans `/bookings` avec date/pax/pickup | ☐ |
| 3 | Résa incomplète | "Can I book a boat trip?" | UNE ou deux questions pour les infos manquantes (date, pax…), pas un interrogatoire | Conversation suivie dans `/inbox` | ☐ |
| 4 | Plainte → escalade | "This is unacceptable, the boat left without us and nobody answers!!" | Réponse d'apaisement courte, PAS de réponse de fond, pas de promesse de remboursement | Escalade visible dans `/activity`, notification owner (WhatsApp `OWNER_WHATSAPP`) | ☐ |
| 5 | Langue française | "Bonjour, vous avez de la place samedi pour 4 personnes ?" | Réponse **en français**, même qualité qu'en anglais | Lead/booking normaux | ☐ |
| 6 | Hors-sujet | "What's the capital of Australia?" | Recentrage poli sur le business, pas de réponse encyclopédique | Rien d'anormal dans `/activity` | ☐ |

**Après la grille** : vérifier `/activity` — chaque action IA doit y être
loggée (c'est l'argument de transparence de la landing).

---

# Checklist pré-lancement (avant d'envoyer le lien)

1. ☐ https://assistant-ai-mocha-two.vercel.app/ s'ouvre en navigation privée (pas de login Vercel, pas de 403)
2. ☐ `DASHBOARD_PASSWORD` changé sur Vercel (plus `change-me`), login OK
3. ☐ Business row créé (`/api/setup`) et `/knowledge` rempli (services + prix + FAQ + ton)
4. ☐ WhatsApp : un message test reçoit une réponse correcte en < 30 s
5. ☐ Email : `/api/gmail/status` vert, un email test traité par le cron (15 min max)
6. ☐ Escalade : le scénario 4 ci-dessus ping le owner et n'est PAS auto-répondu
7. ☐ Une résa test apparaît dans `/bookings` avec date/pax
8. ☐ `/inbox`, `/leads`, `/activity` reflètent fidèlement les messages test
9. ☐ Testé sur téléphone : landing + console lisibles et utilisables à 390px
10. ☐ Guide 1 page envoyé au client avec le lien, le mot de passe console et le numéro WhatsApp à contacter
