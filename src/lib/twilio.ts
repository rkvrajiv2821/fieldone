// src/lib/twilio.ts

import twilio from "twilio";

const accountSid  = process.env.TWILIO_ACCOUNT_SID;
const authToken   = process.env.TWILIO_AUTH_TOKEN;
const fromNumber  = process.env.TWILIO_WHATSAPP_FROM;

// Check if Twilio is configured
export function isTwilioConfigured(): boolean {
  return !!(
    accountSid && accountSid !== "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" &&
    authToken  && authToken  !== "your_auth_token_here" &&
    fromNumber
  );
}

let client: twilio.Twilio | null = null;

function getClient() {
  if (!client) client = twilio(accountSid!, authToken!);
  return client;
}

// Core send — never throws, always returns result
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!isTwilioConfigured()) {
    console.log("⚠️  Twilio not configured — WhatsApp skipped");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const toNumber = to.startsWith("whatsapp:")
      ? to
      : `whatsapp:${to.startsWith("+") ? to : `+${to}`}`;

    const message = await getClient().messages.create({
      from: fromNumber!,
      to:   toNumber,
      body,
    });

    console.log(`✅ WhatsApp sent to ${toNumber}: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error("❌ WhatsApp error:", error.message);
    return { success: false, error: error.message };
  }
}

// ── Follow-up scheduled ───────────────────────────────────────────────────────
export async function sendFollowUpReminder({
  managerPhone, managerName, leadName, company, scheduledTime, priority,
}: {
  managerPhone: string; managerName: string; leadName: string;
  company?: string; scheduledTime: string; priority: string;
}) {
  const body =
`🔔 *Follow-up Reminder*

Hi ${managerName},

You have a *${priority} priority* follow-up scheduled:

👤 Lead: *${leadName}*${company ? `\n🏢 Company: *${company}*` : ""}
⏰ Time: *${scheduledTime}*

Please ensure you follow up on time.

_GZFieldOne — Never miss a lead_`;

  return sendWhatsAppMessage(managerPhone, body);
}

// ── Follow-up overdue ─────────────────────────────────────────────────────────
export async function sendFollowUpOverdueAlert({
  managerPhone, managerName, leadName, company, overdueCount,
}: {
  managerPhone: string; managerName: string; leadName: string;
  company?: string; overdueCount: number;
}) {
  const body =
`⚠️ *Overdue Follow-up Alert*

Hi ${managerName},

${overdueCount > 1
  ? `You have *${overdueCount} overdue follow-ups* including "${leadName}".`
  : `Your follow-up with *${leadName}*${company ? ` (${company})` : ""} is *overdue*.`
}

Please take action immediately.

_GZFieldOne_`;

  return sendWhatsAppMessage(managerPhone, body);
}

// ── Lead assigned ─────────────────────────────────────────────────────────────
export async function sendLeadAssignedNotification({
  managerPhone, managerName, leadName, company, source,
}: {
  managerPhone: string; managerName: string; leadName: string;
  company?: string; source?: string;
}) {
  const body =
`📋 *New Lead Assigned*

Hi ${managerName},

A new lead has been assigned to you:

👤 Lead: *${leadName}*${company ? `\n🏢 Company: *${company}*` : ""}${source ? `\n📌 Source: *${source}*` : ""}

Login to GZFieldOne to schedule a follow-up.

_GZFieldOne_`;

  return sendWhatsAppMessage(managerPhone, body);
}
