---
name: insurance-app
description: Expert-level skill for the insurance-app/ Next.js project AND the life insurance domain it serves. Use when working on this repo OR when reasoning about insurance business logic — policy lifecycle, premium/commission calculations, renewal/lapse handling, agent recruitment and team performance, customer segmentation, persistency rate, FYP/RYP, sum insured vs premium, beneficiary rules, compliance (cooling-off, KYC, suitability), or any feature touching ตัวแทน/หัวหน้าทีม/ลูกค้า/กรมธรรม์. Trigger on Thai or English terms: ลูกค้า, กรมธรรม์, ตัวแทน, หัวหน้าทีม, เบี้ยประกัน, ทุนประกัน, ผู้รับผลประโยชน์, ขาดอายุ, ต่ออายุ, ค่าคอม, ยอดขาย, persistency, FYP, premium, policy, agent, supervisor, beneficiary, lapse, renewal, commission.
---

# insurance-app — full-stack + domain expert

You are working on a production system that life insurance agents and their team leaders actually use to run their book of business. Code changes affect real customers and real money. Apply both the technical rules below and the domain understanding in `references/insurance-domain.md` to every change.

## Mindset for this project

1. **Domain first, code second.** Before coding a feature, read `references/insurance-domain.md` and confirm the business rule. A "small" field like `payment_type` drives renewal cadence, commission timing, and lapse risk — it is not just a dropdown.
2. **Money and dates are sacred.** Never lose precision on `premium`/`sum_insured`. Never compare dates as strings unless they are ISO `YYYY-MM-DD` (they are, by convention). Use SQLite `date()` for comparisons.
3. **The agent is the user.** They are not a developer. UI must be tappable on phone (they work in the field), error messages in Thai, dates in Buddhist year only if explicitly asked.
4. **The supervisor's job is intervention.** Every supervisor view should make it obvious "who needs my attention today" — expiring policies, idle agents, lapsed customers. Don't just show data; surface action.
5. **Auditability matters.** Insurance regulators (คปภ.) and the carrier care who touched what. Prefer additive history over destructive edits when adding new features. Soft delete > hard delete for anything policy-related (when we add it).

## Stack and hard constraints
- Next.js 14 App Router + Server Actions
- TypeScript strict, Tailwind, path alias `@/*` → `src/*`
- DB: `node:sqlite` builtin (Node 24+) — **do NOT add `better-sqlite3`**, native build fails on this machine
- Dev port: **3001**, DB file: `data.db` at project root (override with `DB_PATH`)
- Auth: HS256 JWT in httpOnly cookie `iapp_session`; secret from `AUTH_SECRET`
- Thai language UI by default; keep labels in Thai, code in English

## File map
- `src/lib/db.ts` — schema init, singleton `getDb()`
- `src/lib/auth.ts` — session helpers, password hashing
- `src/lib/queries.ts` — all read queries (single place)
- `src/lib/actions.ts` — all server actions (writes). Every write must call `requireUser`/`requireSupervisor` and `assertCustomerOwnership` where relevant.
- `src/app/agent/**` — agent-only pages
- `src/app/supervisor/**` — supervisor-only pages
- `src/app/customers/[id]/**` — shared (access-checked inline)
- `src/components/Shell.tsx`, `CustomerForm.tsx`, `PolicyForm.tsx`

## Authorization model (do not break)
- Agents see only `customers WHERE agent_id = self.id`
- Supervisors see customers from any user where `supervisor_id = self.id` OR `id = self.id`
- `assertCustomerOwnership(customerId)` in `actions.ts` is the single chokepoint — reuse it
- Never expose a server action that mutates without `requireUser`/`requireSupervisor` + ownership check

## Decision checklist before implementing a new feature

When the user asks for "เพิ่มฟีเจอร์ X", run through this list before touching code:

1. **Who is the actor?** Agent, supervisor, or both? (Determines route, guard, and which scope query to use.)
2. **Whose data does it touch?** Own / team / all? (Determines query in `queries.ts`.)
3. **Is it a read or a write?** Writes go through `actions.ts` with full auth chain.
4. **Does it touch money or dates?** Use `n()` helper for numbers, ISO format for dates. Add to `references/insurance-domain.md` if a new business rule is introduced.
5. **Does it need history / audit?** If yes, propose adding an `events` or `_history` table rather than overwriting.
6. **Does it change the schema?** Follow `references/migrations.md` — update `CREATE TABLE` AND add idempotent `ALTER`.
7. **Does it need a notification?** (Renewal reminder, lapse warning.) Note that there is no scheduler yet — propose how it would fire (cron, on-login fetch, etc.) instead of silently dropping it.
8. **What does the supervisor view of this look like?** If only the agent sees it, you usually missed the supervisor's intervention case.

## Common business-driven tasks

### "เพิ่มการคำนวณค่าคอมมิชชั่น"
- Read `references/insurance-domain.md` § Commission first. FYC vs RYC differ.
- Store rate per policy (`commission_rate REAL`) — don't hardcode by product
- Surface YTD commission on both agent dashboard and supervisor team view
- Don't auto-compute payouts; this is a record, not an accounting system

### "แจ้งเตือนต่ออายุ"
- Already partially built (`/supervisor/expiring`). To extend to agent side:
  - Add to agent dashboard a "ลูกค้าต้องติดต่อสัปดาห์นี้" widget using `expiringPolicies([self.id], 30)`
  - Track contact attempts in a new `customer_contacts` table (date, type, outcome, note)
  - Status flow: ใกล้หมด → ติดต่อแล้ว → ต่ออายุ / ไม่ต่อ / รอการตัดสินใจ

### "เพิ่มผลิตภัณฑ์ประกัน"
- Don't hardcode a product list — keep `product_name` as free text for now
- If a fixed list is requested, add a `products` table with `code, name, category (life/health/annuity/PA), default_commission_rate`
- Categories matter for KPI rollup (see domain doc)

### "Dashboard ที่ดีขึ้น"
- Read `references/kpis.md` for the KPIs the industry actually tracks
- At minimum a supervisor dashboard should show: ลูกค้าใหม่เดือนนี้, FYP เดือนนี้, persistency 13th/25th month, agents who haven't logged a new policy in 30 days

## Things to avoid
- Adding `better-sqlite3` (build fails)
- Client-side data fetching for owned resources (use server components + queries)
- Bypassing `assertCustomerOwnership` "just for this one place"
- Hardcoding role checks in components — guard in the page, not in JSX
- Adding API routes for things server actions can do
- Storing money as floats without thinking — fine for THB whole baht, but if สตางค์ matters, use integer cents
- Treating `payment_type` as cosmetic — it drives renewal frequency and commission timing
- Deleting policy records on "cancel" — set `status='cancelled'`, keep the row
- Treating Thai national IDs as integers (leading zeros, checksum) — always TEXT

## Tooling shipped with this skill
- `scripts/new-page.sh <agent|supervisor> <route>` — scaffolds a page with auth boilerplate
- `scripts/reset-db.sh` — wipes and reseeds
- `scripts/check-thai-id.py <13-digit-id>` — validates Thai national ID checksum
- `references/schema.md` — DDL reference
- `references/migrations.md` — safe column additions
- `references/auth-patterns.md` — auth snippets
- `references/insurance-domain.md` — **read this before any feature work**
- `references/kpis.md` — KPIs the supervisor view should expose
- `references/glossary.md` — Thai↔English insurance terms
