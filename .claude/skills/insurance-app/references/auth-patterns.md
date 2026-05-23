# Auth patterns

## Page-level guards

Agent-only page:
```ts
import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const u = await requireUser();
  if (u.role !== 'agent') redirect('/supervisor');
  // ...
}
```

Supervisor-only page:
```ts
import { requireSupervisor } from '@/lib/auth';

export default async function Page() {
  const u = await requireSupervisor();
  // ...
}
```

Shared page (customer detail) — check ownership manually:
```ts
const u = await requireUser();
const c = getCustomer(id);
if (!c) notFound();
if (u.role === 'agent' && c.agent_id !== u.id) redirect('/agent');
if (u.role === 'supervisor') {
  const owner = getDb().prepare('SELECT supervisor_id, id FROM users WHERE id = ?').get(c.agent_id) as any;
  if (!owner || (owner.supervisor_id !== u.id && owner.id !== u.id)) redirect('/supervisor');
}
```

## Server action template

```ts
'use server';
export async function doThing(customerId: number, formData: FormData) {
  await assertCustomerOwnership(customerId); // for customer-scoped writes
  // OR: const u = await requireSupervisor(); for team admin writes
  getDb().prepare('...').run(...);
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}
```

## Calling actions from JSX

Inline closure (when you need to bind an id):
```tsx
<form action={async (fd: FormData) => { 'use server'; await createPolicy(id, fd); }}>
```

Direct (when the action signature matches FormData only):
```tsx
<form action={createCustomer}>
```

## Adding a new role
The CHECK constraint on `users.role` allows only `agent` and `supervisor`. To add a role (e.g. `admin`):
1. Update the CHECK in `db.ts` — requires a table rebuild on existing DBs; easier to wipe
2. Update `SessionUser['role']` union in `auth.ts`
3. Add a `requireAdmin()` helper
4. Add the role's pages under `src/app/admin/`
