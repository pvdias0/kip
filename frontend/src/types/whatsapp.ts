export type WhatsAppVerificationStatus = "pending" | "verified" | string;

export interface WhatsAppProfile {
  phone_number: string | null;
  phone_number_e164: string | null;
  opted_in: boolean;
  opted_in_at: string | null;
  opt_in_source: string | null;
  opt_out_at: string | null;
  verification_status: WhatsAppVerificationStatus;
  receive_support_messages: boolean;
  receive_transactional_messages: boolean;
  receive_weekly_summary: boolean;
  receive_budget_alerts: boolean;
}
