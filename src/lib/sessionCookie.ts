import { cookies } from 'next/headers';

const COOKIE_NAME = 'sf_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

export interface SessionData {
  accessToken: string;
  instanceUrl: string;
  orgName: string;
  orgType: string;
}

export function getSession(): SessionData {
  const cookie = cookies().get(COOKIE_NAME);
  if (!cookie?.value) {
    throw new Error('Not authenticated. Please connect to Salesforce first.');
  }
  try {
    return JSON.parse(cookie.value) as SessionData;
  } catch {
    throw new Error('Invalid session. Please reconnect.');
  }
}

export function setSession(data: SessionData): void {
  cookies().set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}

export function hasSession(): boolean {
  return !!cookies().get(COOKIE_NAME)?.value;
}
