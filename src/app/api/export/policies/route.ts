import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listCustomersByAgent, listCustomersBySupervisor, listPoliciesByCustomer } from '@/lib/queries';

function csv(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customers = session.role === 'supervisor'
    ? listCustomersBySupervisor(session.id)
    : listCustomersByAgent(session.id);

  const header = ['ลูกค้า', 'เลขที่กรมธรรม์', 'ผลิตภัณฑ์', 'การชำระ',
    'เบี้ย (฿)', 'ทุน (฿)', 'วันเริ่ม', 'วันหมดอายุ', 'สถานะ',
    'ค่าคอม%', 'ค่าคอม (฿)', 'ประเภทคอม', 'ตัวแทน'];
  const rows: string[][] = [];

  for (const c of customers) {
    const policies = listPoliciesByCustomer(c.id);
    for (const p of policies) {
      rows.push([
        c.full_name, p.policy_no || '', p.product_name, p.payment_type,
        String(p.premium), String(p.sum_insured), p.start_date, p.end_date, p.status,
        String(p.commission_rate || 0), String(p.commission_amount || 0), p.commission_type || 'FYC',
        (c as any).agent_name || session.full_name,
      ]);
    }
  }

  const content = '﻿' + csv([header, ...rows]);
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="policies-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
