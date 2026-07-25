import { logger } from '../lib/logger';

/**
 * Swappable SMS-delivery seam. Our backend owns OTP generation, hashing, and
 * verification (see otp_challenges + the /auth/otp routes); a provider only has
 * to *send* a text message. Swapping MSG91 → Gupshup/Kaleyra later is a new
 * class here plus an env-var change, with no route-handler changes.
 */
export interface OtpProvider {
  readonly name: string;
  sendSms(to: string, message: string): Promise<{ ok: boolean; dev?: boolean }>;
}

/**
 * MSG91 transactional SMS. Chosen over Gupshup for India: purpose-built
 * transactional-SMS REST API, transparent per-SMS pricing, DLT-ready.
 *
 * NOTE (ops, not code): production delivery to Indian numbers requires the
 * message template to be registered on TRAI's DLT platform and the sender id
 * approved. That's a dashboard/registration step, not something code controls.
 *
 * Env: MSG91_AUTH_KEY (required to activate), MSG91_SENDER_ID (6-char header),
 * MSG91_ROUTE (default '4' = transactional).
 */
class Msg91Provider implements OtpProvider {
  readonly name = 'msg91';
  constructor(
    private authKey: string,
    private senderId: string,
    private route: string,
  ) {}

  async sendSms(to: string, message: string): Promise<{ ok: boolean }> {
    // MSG91 expects the number without the leading '+', with country code.
    const mobiles = to.replace(/^\+/, '');
    const url = new URL('https://api.msg91.com/api/sendhttp.php');
    url.searchParams.set('authkey', this.authKey);
    url.searchParams.set('mobiles', mobiles);
    url.searchParams.set('message', message);
    url.searchParams.set('sender', this.senderId);
    url.searchParams.set('route', this.route);
    url.searchParams.set('country', '91');

    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      const body = await res.text();
      // MSG91 returns a request id string on success, or an error JSON.
      const ok = res.ok && !/error/i.test(body);
      if (!ok) logger.warn({ status: res.status, body }, 'MSG91 send failed');
      return { ok };
    } catch (err) {
      logger.error({ err }, 'MSG91 send threw');
      return { ok: false };
    }
  }
}

/**
 * Dev fallback when no MSG91 key is configured. Logs the message (including the
 * OTP) to the server console so the whole flow is testable with zero API keys,
 * and reports dev:true so callers never imply a real SMS went out.
 */
class ConsoleProvider implements OtpProvider {
  readonly name = 'console-dev';
  async sendSms(to: string, message: string): Promise<{ ok: boolean; dev: boolean }> {
    logger.info({ to, message }, '📨 [OTP dev mode] SMS not sent — no MSG91_AUTH_KEY. Code logged above.');
    return { ok: true, dev: true };
  }
}

let cached: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
  if (cached) return cached;
  const authKey = process.env.MSG91_AUTH_KEY;
  if (authKey) {
    cached = new Msg91Provider(
      authKey,
      process.env.MSG91_SENDER_ID || 'STEADY',
      process.env.MSG91_ROUTE || '4',
    );
  } else {
    cached = new ConsoleProvider();
  }
  return cached;
}
