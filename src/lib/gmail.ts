// ===========================================================================
// Gmail client (OAuth2 refresh-token flow). Lets the app read unread emails
// and send replies from the owner's Gmail (e.g. CYRIL.JOSEPH32@gmail.com).
// Lazily initialised; needs GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET /
// GMAIL_REFRESH_TOKEN in the environment.
// ===========================================================================

import { google, gmail_v1 } from "googleapis";
import { env, gmailConfigured } from "./config";

export { gmailConfigured };

let _gmail: gmail_v1.Gmail | null = null;

function client(): gmail_v1.Gmail {
  if (!_gmail) {
    const oauth2 = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
    oauth2.setCredentials({ refresh_token: env.gmailRefreshToken });
    _gmail = google.gmail({ version: "v1", auth: oauth2 });
  }
  return _gmail;
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string; // raw "Name <addr>"
  fromEmail: string; // just the address
  fromName: string | null;
  subject: string;
  body: string; // plain text
  messageIdHeader: string | null; // for threading replies
}

/** List unread messages in the inbox (skips promotions/social). */
export async function listUnread(max = 10): Promise<{ id: string }[]> {
  const res = await client().users.messages.list({
    userId: "me",
    q: "is:unread in:inbox -category:promotions -category:social",
    maxResults: max,
  });
  return (res.data.messages ?? []).map((m) => ({ id: m.id! }));
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

function decodeBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";
  const fromData = (data?: string | null) =>
    data ? Buffer.from(data, "base64").toString("utf-8") : "";

  // Prefer text/plain.
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return fromData(payload.body.data);
  }
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return fromData(plain.body.data);
    // recurse (multipart/alternative or nested)
    for (const p of payload.parts) {
      const t = decodeBody(p);
      if (t) return t;
    }
  }
  if (payload.body?.data) return fromData(payload.body.data);
  return "";
}

export async function getEmail(id: string): Promise<ParsedEmail> {
  const res = await client().users.messages.get({ userId: "me", id, format: "full" });
  const msg = res.data;
  const headers = msg.payload?.headers;
  const from = header(headers, "From") ?? "";
  const match = from.match(/<([^>]+)>/);
  const fromEmail = (match ? match[1] : from).trim().toLowerCase();
  const fromName = from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || null;
  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from,
    fromEmail,
    fromName,
    subject: header(headers, "Subject") ?? "(no subject)",
    body: decodeBody(msg.payload).slice(0, 6000),
    messageIdHeader: header(headers, "Message-ID"),
  };
}

/** Send a reply (threaded if threadId/inReplyTo provided). */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string | null;
}): Promise<void> {
  const subject = opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`;
  const lines = [
    `To: ${opts.to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
  ];
  if (opts.inReplyTo) {
    lines.push(`In-Reply-To: ${opts.inReplyTo}`);
    lines.push(`References: ${opts.inReplyTo}`);
  }
  const raw = Buffer.from(`${lines.join("\r\n")}\r\n\r\n${opts.body}`)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await client().users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: opts.threadId },
  });
}

/** Mark a message read (remove UNREAD label). */
export async function markRead(id: string): Promise<void> {
  await client().users.messages.modify({
    userId: "me",
    id,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}
