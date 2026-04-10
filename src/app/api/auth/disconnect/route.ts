import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/sessionCookie';

/**
 * POST /api/auth/disconnect
 * Clears the session cookie.
 */
export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
