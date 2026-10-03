import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Per-session config, not a secret. "CigarsForYou KYC" in the Didit console.
const WORKFLOW_ID = "e6952104-027b-4b6b-8e24-427e9869cacd";
const DIDIT_SESSION_URL = "https://verification.didit.me/v3/session/";
const CALLBACK_URL = "https://cigarsforyou.com.au";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const diditApiKey = defineSecret("DIDIT_API_KEY");
const diditWebhookSecret = defineSecret("DIDIT_WEBHOOK_SECRET");

type SessionMode = "signup" | "guest" | "account";

function db() {
  return admin.firestore();
}

function nowIso() {
  return new Date().toISOString();
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isApprovedStatus(status: unknown): boolean {
  return status === "Approved";
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shortenFloats);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, shortenFloats(entry)])
    );
  }
  if (typeof value === "number" && !Number.isInteger(value) && value % 1 === 0) {
    return Math.trunc(value);
  }
  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function signaturesMatch(expectedHex: string, receivedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "utf8");
  const received = Buffer.from(receivedHex, "utf8");
  if (expected.length !== received.length || expected.length === 0) return false;
  return timingSafeEqual(expected, received);
}

function isEmailAlreadyExists(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "auth/email-already-exists"
  );
}

async function createDiditSessionRecord(input: {
  mode: SessionMode;
  vendorData: string;
  email?: string;
  displayName?: string;
  uid?: string;
  pendingSignupId?: string;
}): Promise<{ url: string; sessionId: string }> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Age verification is not configured.");
  }

  const response = await fetch(DIDIT_SESSION_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: WORKFLOW_ID,
      vendor_data: input.vendorData,
      callback: CALLBACK_URL,
      metadata: { mode: input.mode },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error("Didit session create failed", { status: response.status, detail });
    throw new HttpsError("internal", "Could not start age verification.");
  }

  const session = (await response.json()) as { session_id?: string; url?: string };
  const sessionId = asTrimmedString(session.session_id);
  const url = asTrimmedString(session.url);
  if (!sessionId || !url) {
    throw new HttpsError("internal", "Age verification did not return a session.");
  }

  const createdAt = nowIso();
  const batch = db().batch();
  batch.set(db().collection("ageVerifications").doc(sessionId), {
    status: "Not Started",
    vendorData: input.vendorData,
    mode: input.mode,
    pendingSignupId: input.pendingSignupId || null,
    uid: input.uid || null,
    email: input.email ? normalizeEmail(input.email) : null,
    displayName: input.displayName || null,
    consumedByUid: null,
    workflowId: WORKFLOW_ID,
    createdAt,
    updatedAt: createdAt,
  });

  if (input.pendingSignupId) {
    batch.set(
      db().collection("pendingSignups").doc(input.pendingSignupId),
      {
        sessionId,
        status: "Not Started",
        updatedAt: createdAt,
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { url, sessionId };
}

export const createDiditSession = onCall(
  { secrets: [diditApiKey], invoker: "public" },
  async (request) => {
    const mode = request.data?.mode;
    if (mode !== "signup" && mode !== "guest" && mode !== "account") {
      throw new HttpsError("invalid-argument", "Choose a signup, guest, or account verification.");
    }

    if (mode === "account") {
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError("unauthenticated", "Sign in before verifying an existing account.");
      }
      const userSnap = await db().collection("users").doc(uid).get();
      if (userSnap.data()?.ageVerified === true) {
        throw new HttpsError("failed-precondition", "This account is already age verified.");
      }
      const email = asTrimmedString(userSnap.data()?.email) || asTrimmedString(request.auth?.token.email);
      const displayName = asTrimmedString(userSnap.data()?.displayName);
      const created = await createDiditSessionRecord({
        mode,
        vendorData: uid,
        uid,
        email,
        displayName,
      });
      return { url: created.url, sessionId: created.sessionId };
    }

    if (mode === "guest") {
      const guestId = `guest:${randomUUID()}`;
      const created = await createDiditSessionRecord({
        mode,
        vendorData: guestId,
      });
      return { url: created.url, sessionId: created.sessionId };
    }

    const email = asTrimmedString(request.data?.email);
    const displayName = asTrimmedString(request.data?.displayName);
    if (!email || !email.includes("@") || !displayName) {
      throw new HttpsError("invalid-argument", "Name and email are required before age verification.");
    }

    const pendingSignupId = randomUUID();
    const createdAt = nowIso();
    await db().collection("pendingSignups").doc(pendingSignupId).set({
      email: normalizeEmail(email),
      displayName,
      status: "Not Started",
      sessionId: null,
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
    });

    try {
      const created = await createDiditSessionRecord({
        mode,
        vendorData: pendingSignupId,
        pendingSignupId,
        email,
        displayName,
      });
      return {
        url: created.url,
        sessionId: created.sessionId,
        pendingSignupId,
      };
    } catch (err) {
      await db().collection("pendingSignups").doc(pendingSignupId).delete().catch(() => undefined);
      throw err;
    }
  }
);

export const getDiditStatus = onCall({ invoker: "public" }, async (request) => {
  const sessionId = asTrimmedString(request.data?.sessionId);
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "A verification session is required.");
  }

  const snap = await db().collection("ageVerifications").doc(sessionId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Age verification was not found.");
  }

  const data = snap.data() || {};
  return {
    status: typeof data.status === "string" ? data.status : "Not Started",
    consumed: typeof data.consumedByUid === "string" && data.consumedByUid.length > 0,
    mode: typeof data.mode === "string" ? data.mode : null,
  };
});

async function claimApprovedVerification(sessionId: string, email: string): Promise<{ pendingSignupId: string | null }> {
  const verificationRef = db().collection("ageVerifications").doc(sessionId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(verificationRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Age verification was not found.");
    }

    const data = snap.data() || {};
    if (!isApprovedStatus(data.status)) {
      throw new HttpsError("failed-precondition", "Age verification is not approved.");
    }
    if (typeof data.consumedByUid === "string" && data.consumedByUid) {
      throw new HttpsError("failed-precondition", "This age verification has already been used.");
    }
    if (data.mode === "account") {
      throw new HttpsError("failed-precondition", "This age verification is already linked to an account.");
    }

    const consumingAt = typeof data.consumingAt === "string" ? Date.parse(data.consumingAt) : 0;
    if (data.consuming === true && Number.isFinite(consumingAt) && Date.now() - consumingAt < 120000) {
      throw new HttpsError("aborted", "This verification is already being used.");
    }

    const pendingSignupId = typeof data.pendingSignupId === "string" ? data.pendingSignupId : null;
    if (data.mode === "signup") {
      if (!pendingSignupId) {
        throw new HttpsError("failed-precondition", "Signup verification is incomplete.");
      }
      const pendingSnap = await tx.get(db().collection("pendingSignups").doc(pendingSignupId));
      const pending = pendingSnap.data() || {};
      const pendingEmail = asTrimmedString(pending.email);
      if (!pendingEmail || pendingEmail !== normalizeEmail(email)) {
        throw new HttpsError("permission-denied", "Email does not match this verification.");
      }
      const expiresAt = typeof pending.expiresAt === "string" ? Date.parse(pending.expiresAt) : NaN;
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        throw new HttpsError("failed-precondition", "This signup verification has expired. Please start again.");
      }
    }

    tx.update(verificationRef, {
      consuming: true,
      consumingAt: nowIso(),
    });

    return { pendingSignupId };
  });
}

export const claimDiditForUser = onCall({ invoker: "public" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to save this age verification.");
  }

  const sessionId = asTrimmedString(request.data?.sessionId);
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "A verification session is required.");
  }

  await db().runTransaction(async (tx) => {
    const verificationRef = db().collection("ageVerifications").doc(sessionId);
    const snap = await tx.get(verificationRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Age verification was not found.");
    }

    const data = snap.data() || {};
    if (!isApprovedStatus(data.status)) {
      throw new HttpsError("failed-precondition", "Age verification is not approved.");
    }

    const consumedByUid = typeof data.consumedByUid === "string" ? data.consumedByUid : "";
    if (consumedByUid && consumedByUid !== uid) {
      throw new HttpsError("failed-precondition", "This age verification has already been used.");
    }
    if (data.consuming === true && !consumedByUid) {
      throw new HttpsError("aborted", "This verification is already being used.");
    }

    const verifiedAt = nowIso();
    tx.set(
      db().collection("users").doc(uid),
      {
        ageVerified: true,
        ageVerificationStatus: "Approved",
        diditSessionId: sessionId,
        ageVerifiedAt: verifiedAt,
      },
      { merge: true }
    );

    if (!consumedByUid) {
      tx.update(verificationRef, {
        consumedByUid: uid,
        consuming: false,
        updatedAt: verifiedAt,
      });
    }
  });

  return { ok: true };
});

export const completeSignup = onCall({ invoker: "public" }, async (request) => {
  const email = asTrimmedString(request.data?.email);
  const password = typeof request.data?.password === "string" ? request.data.password : "";
  const displayName = asTrimmedString(request.data?.displayName);
  const pendingSignupId = asTrimmedString(request.data?.pendingSignupId);
  let sessionId = asTrimmedString(request.data?.sessionId);

  if (!email || !email.includes("@") || !displayName) {
    throw new HttpsError("invalid-argument", "Name and email are required.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  if (pendingSignupId) {
    const pendingSnap = await db().collection("pendingSignups").doc(pendingSignupId).get();
    if (!pendingSnap.exists) {
      throw new HttpsError("not-found", "Signup verification was not found.");
    }
    const pendingEmail = asTrimmedString(pendingSnap.data()?.email);
    if (pendingEmail !== normalizeEmail(email)) {
      throw new HttpsError("permission-denied", "Email does not match this verification.");
    }
    sessionId = asTrimmedString(pendingSnap.data()?.sessionId);
  }

  if (!sessionId) {
    throw new HttpsError("invalid-argument", "An approved age verification is required.");
  }

  const claimed = await claimApprovedVerification(sessionId, email);
  const verificationRef = db().collection("ageVerifications").doc(sessionId);
  let createdUid: string | null = null;

  try {
    const userRecord = await admin.auth().createUser({
      email: normalizeEmail(email),
      password,
      displayName,
    });
    createdUid = userRecord.uid;
    const createdAt = nowIso();

    const batch = db().batch();
    batch.set(db().collection("users").doc(userRecord.uid), {
      uid: userRecord.uid,
      email: normalizeEmail(email),
      displayName,
      role: "customer",
      createdAt,
      addresses: [],
      ageVerified: true,
      ageVerificationStatus: "Approved",
      diditSessionId: sessionId,
      ageVerifiedAt: createdAt,
    });
    batch.update(verificationRef, {
      consumedByUid: userRecord.uid,
      consuming: false,
      updatedAt: createdAt,
    });
    if (claimed.pendingSignupId) {
      batch.set(
        db().collection("pendingSignups").doc(claimed.pendingSignupId),
        {
          status: "completed",
          consumedByUid: userRecord.uid,
          updatedAt: createdAt,
        },
        { merge: true }
      );
    }
    await batch.commit();

    return { uid: userRecord.uid };
  } catch (err) {
    await verificationRef.update({ consuming: false, consumedByUid: null }).catch(() => undefined);
    if (createdUid) {
      await admin.auth().deleteUser(createdUid).catch(() => undefined);
      await db().collection("users").doc(createdUid).delete().catch(() => undefined);
    }
    if (isEmailAlreadyExists(err)) {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    if (err instanceof HttpsError) throw err;
    logger.error("Didit signup completion failed", err);
    throw new HttpsError("internal", "Could not create the account.");
  }
});

export const diditWebhook = onRequest(
  { secrets: [diditWebhookSecret], invoker: "public", cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("method");
      return;
    }

    const raw = req.rawBody?.toString("utf8") || "";
    const timestamp = Number(req.get("x-timestamp"));
    if (!raw || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
      res.status(401).send("stale");
      return;
    }

    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) {
      logger.error("DIDIT_WEBHOOK_SECRET is not configured");
      res.status(500).send("unconfigured");
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(raw) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        res.status(400).send("invalid");
        return;
      }
      parsed = value as Record<string, unknown>;
    } catch (err) {
      logger.warn("Didit webhook JSON parse failed", { raw, err });
      res.status(400).send("invalid");
      return;
    }

    const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));
    const expected = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
    const provided = (req.get("x-signature-v2") || "").trim().toLowerCase();
    if (!signaturesMatch(expected, provided)) {
      logger.warn("Didit webhook signature mismatch", { raw });
      res.status(401).send("bad sig");
      return;
    }

    const sessionId = asTrimmedString(parsed.session_id);
    const status = asTrimmedString(parsed.status);
    const webhookType = asTrimmedString(parsed.webhook_type);
    const eventId =
      asTrimmedString(parsed.event_id) ||
      `${sessionId}:${webhookType}:${status}:${String(parsed.timestamp || timestamp)}`;

    try {
      await db().runTransaction(async (tx) => {
        const eventRef = db().collection("diditWebhookEvents").doc(eventId);
        const verificationRef = sessionId ? db().collection("ageVerifications").doc(sessionId) : null;
        const eventSnap = await tx.get(eventRef);
        if (eventSnap.exists) return;

        const verificationSnap = verificationRef ? await tx.get(verificationRef) : null;
        const existing = verificationSnap?.data() || {};
        const receivedAt = nowIso();

        tx.set(eventRef, {
          eventId,
          sessionId: sessionId || null,
          status: status || null,
          webhookType: webhookType || null,
          receivedAt,
        });

        if (!verificationRef) return;

        const patch: Record<string, unknown> = {
          status: status || existing.status || "Not Started",
          updatedAt: receivedAt,
          lastWebhookType: webhookType || null,
        };
        if (parsed.decision !== undefined && (status === "Approved" || status === "Declined" || status === "In Review" || status === "Abandoned")) {
          patch.decision = parsed.decision;
        }

        const pendingSignupId = typeof existing.pendingSignupId === "string" ? existing.pendingSignupId : null;
        const accountUid = existing.mode === "account" && typeof existing.uid === "string" ? existing.uid : null;
        const consumedByUid = typeof existing.consumedByUid === "string" ? existing.consumedByUid : null;

        if (status === "Approved" && accountUid) {
          tx.set(
            db().collection("users").doc(accountUid),
            {
              ageVerified: true,
              ageVerificationStatus: "Approved",
              diditSessionId: sessionId,
              ageVerifiedAt: receivedAt,
            },
            { merge: true }
          );
          patch.consumedByUid = accountUid;
        }

        if ((status === "Kyc Expired" || status === "KYC Expired") && consumedByUid) {
          tx.set(
            db().collection("users").doc(consumedByUid),
            {
              ageVerified: false,
              ageVerificationStatus: "Kyc Expired",
            },
            { merge: true }
          );
        }

        if (pendingSignupId) {
          tx.set(
            db().collection("pendingSignups").doc(pendingSignupId),
            {
              status: status || null,
              sessionId,
              updatedAt: receivedAt,
            },
            { merge: true }
          );
        }

        tx.set(verificationRef, patch, { merge: true });
      });
    } catch (err) {
      logger.error("Didit webhook processing failed", err);
      res.status(500).send("error");
      return;
    }

    res.status(200).send("ok");
  }
);
