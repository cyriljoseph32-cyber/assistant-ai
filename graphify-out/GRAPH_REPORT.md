# Graph Report - assistant-ai  (2026-08-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 415 nodes · 901 edges · 25 communities (18 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `065b977d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 22

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 31 edges
2. `env` - 29 edges
3. `logAutomation()` - 22 edges
4. `handleInboundMessage()` - 22 edges
5. `supabase` - 20 edges
6. `processInbox()` - 19 edges
7. `sendWhatsApp()` - 17 edges
8. `compilerOptions` - 17 edges
9. `getBusiness()` - 16 edges
10. `useToast()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `requireAuth()`  [EXTRACTED]
  src/app/api/reply/route.ts → src/lib/auth.ts
- `sendWhatsApp()` --calls--> `toWhatsAppAddress()`  [EXTRACTED]
  src/lib/twilio.ts → src/lib/config.ts
- `sendDailyReport()` --calls--> `sendWhatsApp()`  [EXTRACTED]
  src/services/report.service.ts → src/lib/twilio.ts
- `processInbox()` --calls--> `getRecentMessages()`  [EXTRACTED]
  src/services/email.service.ts → src/services/crm.service.ts
- `POST()` --calls--> `logAutomation()`  [EXTRACTED]
  src/app/api/webhooks/whatsapp/route.ts → src/services/crm.service.ts

## Import Cycles
- None detected.

## Communities (25 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (45): Body, maxDuration, POST(), runtime, supabase, client(), sendWhatsApp(), Booking (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (37): count(), dynamic, GET(), runtime, CreateBody, GET(), PATCH(), PatchBody (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (33): authorized(), dynamic, GET(), maxDuration, runtime, dynamic, GET(), runtime (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (38): @anthropic-ai/sdk, googleapis, dependencies, @anthropic-ai/sdk, googleapis, next, react, react-dom (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (25): Body, POST(), runtime, dynamic, GET(), runtime, dynamic, maxDuration (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (22): Body, buildSystemPrompt(), dynamic, maxDuration, POST(), runtime, authorized(), dynamic (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (12): AlertIcon(), BookIcon(), CalendarIcon(), InboxIcon(), LogoutIcon(), Monogram(), P, PulseIcon() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (11): BookingRow, BookingsPage(), LeadRow, LeadsPage(), STATUSES, EmptyState(), PILL_VARIANT, StatusPill() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (14): client(), completeJson(), completeText(), Message, bookingSystemPrompt(), businessContext(), complaintSystemPrompt(), conversationToUserTurn() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): crons, functions, src/app/api/assistant/chat/route.ts, src/app/api/cron/daily-report/route.ts, src/app/api/cron/email/route.ts, src/app/api/cron/followups/route.ts, src/app/api/reply/route.ts, src/app/api/webhooks/whatsapp/route.ts (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.23
Nodes (9): AssistantPage(), onKey(), send(), loadStored(), Msg, SUGGESTIONS, timeOfDay(), SendIcon() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (7): ActivityPage(), Esc, Log, Stats, summarize(), CheckIcon(), fmtDateTime()

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (6): BusinessData, Faq, KnowledgePage(), Service, PlusIcon(), TrashIcon()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (5): Conv, Inbox(), Msg, BackIcon(), timeAgo()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): CommandK(), go(), onInputKey(), GROUP_LABEL, Hit

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (5): authorized(), dynamic, GET(), maxDuration, runtime

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (3): fraunces, inter, metadata

## Knowledge Gaps
- **138 isolated node(s):** `ConversationStatus`, `Escalation`, `FollowUpStatus`, `Intent`, `Review` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `env` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 6`, `Community 9`, `Community 16`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 1` to `Community 0`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 8` to `Community 12`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `ConversationStatus`, `Escalation`, `FollowUpStatus` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06363636363636363 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10220673635307782 - nodes in this community are weakly interconnected._