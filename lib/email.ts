import "server-only";

type Email = { to: string; subject: string; text: string };

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise prints to the
 * server console so local development needs no email provider.
 */
export async function sendEmail({ to, subject, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n[email] to: ${to}\n[email] subject: ${subject}\n${text}\n`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "EventPass <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!response.ok) {
    console.error(`[email] Resend rejected "${subject}" to ${to}: ${await response.text()}`);
  }
}
