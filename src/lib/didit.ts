import { httpsCallable } from 'firebase/functions';
import { DiditSdk, type VerificationResult } from '@didit-protocol/sdk-web';
import { functions } from '../firebase';

const STORAGE_KEY = 'cfy_didit_verified_v1';
const POLL_ATTEMPTS = 20;
const POLL_DELAY_MS = 1500;

const DECLINED_MESSAGE = 'Age verification was declined. You cannot continue.';

export interface CachedDiditApproval {
  sessionId: string;
  status: 'Approved';
  at: string;
}

interface CreateSessionResult {
  url: string;
  sessionId: string;
  pendingSignupId?: string;
}

interface StatusResult {
  status: string;
  consumed: boolean;
  mode: string | null;
}

export type AgeGateResult =
  | { ok: true; sessionId?: string }
  | { ok: false; hardBlock: boolean; message: string };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function diditErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function readCachedDiditApproval(): CachedDiditApproval | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedDiditApproval>;
    if (parsed.status !== 'Approved' || typeof parsed.sessionId !== 'string' || !parsed.sessionId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { sessionId: parsed.sessionId, status: 'Approved', at: typeof parsed.at === 'string' ? parsed.at : '' };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeCachedDiditApproval(sessionId: string) {
  const value: CachedDiditApproval = {
    sessionId,
    status: 'Approved',
    at: new Date().toISOString()
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearCachedDiditApproval() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function createDiditSession(input: {
  mode: 'signup' | 'guest' | 'account';
  email?: string;
  displayName?: string;
}): Promise<CreateSessionResult> {
  const callable = httpsCallable<typeof input, CreateSessionResult>(functions, 'createDiditSession');
  const result = await callable(input);
  return result.data;
}

export async function getDiditStatus(sessionId: string): Promise<StatusResult> {
  const callable = httpsCallable<{ sessionId: string }, StatusResult>(functions, 'getDiditStatus');
  const result = await callable({ sessionId });
  return result.data;
}

export async function claimDiditForCurrentUser(sessionId: string): Promise<void> {
  const callable = httpsCallable<{ sessionId: string }, { ok: boolean }>(functions, 'claimDiditForUser');
  await callable({ sessionId });
}

export async function completeDiditSignup(input: {
  email: string;
  password: string;
  displayName: string;
  pendingSignupId?: string;
  sessionId?: string;
}): Promise<{ uid: string }> {
  const callable = httpsCallable<typeof input, { uid: string }>(functions, 'completeSignup');
  const result = await callable(input);
  return result.data;
}

function waitForSdk(url: string): Promise<VerificationResult> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      DiditSdk.shared.close();
      reject(new Error('Age verification timed out. Please try again.'));
    }, 15 * 60 * 1000);
    DiditSdk.shared.onComplete = (result) => {
      window.clearTimeout(timeout);
      resolve(result);
    };
    void DiditSdk.shared.startVerification({ url }).catch((err) => {
      window.clearTimeout(timeout);
      reject(err instanceof Error ? err : new Error('Could not open age verification.'));
    });
  });
}

async function pollStatus(sessionId: string): Promise<string> {
  let latest = 'Not Started';
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const result = await getDiditStatus(sessionId);
    latest = result.status;
    if (latest === 'Approved' || latest === 'Declined' || latest === 'In Review' || latest === 'Abandoned' || latest === 'Expired' || latest === 'Kyc Expired' || latest === 'KYC Expired' || latest === 'Resubmitted') {
      return latest;
    }
    await sleep(POLL_DELAY_MS);
  }
  return latest;
}

export async function openDiditAndWait(url: string, sessionId: string): Promise<string> {
  const result = await waitForSdk(url);
  if (result.type === 'cancelled') {
    const status = await getDiditStatus(sessionId).catch(() => null);
    if (status?.status === 'Approved' || status?.status === 'Declined') return status.status;
    throw new Error('Age verification was cancelled.');
  }
  return pollStatus(sessionId);
}

function statusMessage(status: string): string {
  if (status === 'Declined') return DECLINED_MESSAGE;
  if (status === 'In Review') return 'Your age check is being reviewed. You cannot continue until it is approved.';
  if (status === 'Expired' || status === 'Kyc Expired' || status === 'KYC Expired') {
    return 'This age check expired. Please try again.';
  }
  return 'Age verification was not completed. Please try again.';
}

async function acceptApprovedSession(sessionId: string, mode: 'guest' | 'account'): Promise<'approved' | 'declined' | 'miss'> {
  try {
    const status = await getDiditStatus(sessionId);
    if (status.status === 'Approved') {
      if (mode === 'account') await claimDiditForCurrentUser(sessionId);
      writeCachedDiditApproval(sessionId);
      return 'approved';
    }
    clearCachedDiditApproval();
    return status.status === 'Declined' ? 'declined' : 'miss';
  } catch (err) {
    const message = diditErrorMessage(err, '').toLowerCase();
    if (message.includes('already been used') || message.includes('not found') || message.includes('not approved')) {
      clearCachedDiditApproval();
      return 'miss';
    }
    throw err;
  }
}

export async function ensureAgeVerified(input: {
  mode: 'guest' | 'account';
  alreadyVerified: boolean;
}): Promise<AgeGateResult> {
  if (input.alreadyVerified) return { ok: true };

  const cached = readCachedDiditApproval();
  if (cached) {
    try {
      const cachedResult = await acceptApprovedSession(cached.sessionId, input.mode);
      if (cachedResult === 'approved') return { ok: true, sessionId: cached.sessionId };
      if (cachedResult === 'declined') return { ok: false, hardBlock: true, message: DECLINED_MESSAGE };
    } catch (err) {
      return {
        ok: false,
        hardBlock: false,
        message: diditErrorMessage(err, 'Age verification could not be confirmed.')
      };
    }
  }

  try {
    const session = await createDiditSession({ mode: input.mode });
    const status = await openDiditAndWait(session.url, session.sessionId);
    if (status === 'Approved') {
      if (input.mode === 'account') await claimDiditForCurrentUser(session.sessionId);
      writeCachedDiditApproval(session.sessionId);
      return { ok: true, sessionId: session.sessionId };
    }
    clearCachedDiditApproval();
    return {
      ok: false,
      hardBlock: status === 'Declined',
      message: statusMessage(status)
    };
  } catch (err) {
    return {
      ok: false,
      hardBlock: false,
      message: diditErrorMessage(err, 'Age verification could not be completed.')
    };
  }
}
