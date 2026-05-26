import { type NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL('/login', req.url));
}
export const POST = GET;
