#!/usr/bin/env bash
# Scaffold a new page with the correct auth guard.
# Usage: new-page.sh <agent|supervisor> <route-segment>
#   new-page.sh agent reports
#   new-page.sh supervisor commissions
set -euo pipefail

ROLE="${1:-}"
ROUTE="${2:-}"
if [ -z "$ROLE" ] || [ -z "$ROUTE" ]; then
  echo "Usage: $0 <agent|supervisor> <route-segment>" >&2
  exit 1
fi
if [ "$ROLE" != "agent" ] && [ "$ROLE" != "supervisor" ]; then
  echo "Role must be 'agent' or 'supervisor'." >&2
  exit 1
fi

DIR="src/app/${ROLE}/${ROUTE}"
if [ -e "$DIR" ]; then
  echo "$DIR already exists." >&2
  exit 1
fi
mkdir -p "$DIR"

if [ "$ROLE" = "agent" ]; then
  cat > "$DIR/page.tsx" <<'EOF'
import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';

export default async function Page() {
  const u = await requireUser();
  if (u.role !== 'agent') redirect('/supervisor');
  return (
    <Shell user={u} nav={[{ href: '/agent', label: '← กลับ' }]}>
      <h1 className="text-2xl font-bold mb-4">หน้าใหม่</h1>
      <div className="card">TODO</div>
    </Shell>
  );
}
EOF
else
  cat > "$DIR/page.tsx" <<'EOF'
import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
];

export default async function Page() {
  const u = await requireSupervisor();
  return (
    <Shell user={u} nav={supNav}>
      <h1 className="text-2xl font-bold mb-4">หน้าใหม่</h1>
      <div className="card">TODO</div>
    </Shell>
  );
}
EOF
fi

echo "Created $DIR/page.tsx"
echo "Visit: http://localhost:3001/${ROLE}/${ROUTE}"
