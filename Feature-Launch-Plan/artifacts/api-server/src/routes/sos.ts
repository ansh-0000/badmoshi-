import { Router } from 'express';

const router = Router();

async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) return false;

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body }).toString(),
    });
    return res.ok;
  } catch (err) {
    console.error('SOS Twilio dispatch error:', err);
    return false;
  }
}

// POST /api/sos/trigger
router.post('/trigger', async (req, res) => {
  const { latitude, longitude, photos, contacts } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'GPS coordinates required' });
  }

  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  const body = `EMERGENCY SOS: I need help. My live location: ${mapsLink}`;

  console.log('🚨 [SOS TRIGGERED] 🚨');
  console.log(`📍 Location: ${latitude}, ${longitude}`);
  console.log(`📸 Photos captured: ${photos?.length || 0}`);
  console.log(`📞 Contacts on file:`, contacts || []);

  // Best-effort server-side SMS dispatch. Only activates once TWILIO_* env vars
  // are configured — until then this honestly reports dispatched: false so the
  // client falls back to its guaranteed on-device SMS composer.
  let dispatched = false;
  try {
    const results = await Promise.all(
      (contacts || []).map((contact: string) => sendTwilioSms(contact, body))
    );
    dispatched = results.length > 0 && results.every(Boolean);
  } catch (err) {
    console.error('SOS dispatch failed:', err);
  }

  return res.json({
    success: true,
    dispatched,
    message: dispatched
      ? 'SOS alert dispatched via SMS to all contacts'
      : 'SOS logged on server; automatic dispatch is not configured yet (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)',
    timestamp: new Date().toISOString()
  });
});

export default router;
