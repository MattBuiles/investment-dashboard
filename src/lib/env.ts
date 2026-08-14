import "server-only";

const DEFAULT_FEEDBACK_FROM_ADDRESS =
  "investment-dashboard <onboarding@resend.dev>";

function read(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}.`);
  }
  return v;
}

export function getResendApiKey(): string {
  return read("RESEND_API_KEY");
}

export function getFeedbackInbox(): string {
  return read("FEEDBACK_INBOX");
}

export function getUpstashRedisUrl(): string {
  return read("UPSTASH_REDIS_REST_URL");
}

export function getUpstashRedisToken(): string {
  return read("UPSTASH_REDIS_REST_TOKEN");
}

export function getFeedbackFromAddress(): string {
  const v = process.env.FEEDBACK_FROM_ADDRESS;
  if (v && v.trim() !== "") return v;
  return DEFAULT_FEEDBACK_FROM_ADDRESS;
}
