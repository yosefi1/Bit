/**
 * Notification adapter. v1 is a no-op so we can wire the architecture for
 * email/SMS notifications without sending anything yet.
 *
 * To add a real provider (Resend, SendGrid, AWS SES, Twilio...), implement
 * the function bodies below — the call sites elsewhere in the codebase do
 * not need to change.
 */

export interface NotificationContext {
  to: { email?: string; phone?: string; name?: string };
  meta?: Record<string, unknown>;
}

export type NotificationEvent =
  | "submission.created"      // tenant submitted a reading
  | "submission.approved"     // admin approved -> payment due
  | "submission.rejected"     // admin rejected
  | "payment.marked_paid"     // admin marked as paid
  | "cycle.opened"            // new billing cycle
  | "cycle.closed";           // cycle closed

export async function notify(
  event: NotificationEvent,
  ctx: NotificationContext
): Promise<void> {
  // Intentionally a no-op for v1.
  if (process.env.NODE_ENV !== "production") {
    console.info("[notify:%s] -> %o", event, {
      to: ctx.to,
      meta: ctx.meta,
    });
  }
}
