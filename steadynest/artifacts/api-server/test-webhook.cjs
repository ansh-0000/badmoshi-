const crypto = require('crypto');

async function testWebhook() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
  const payload = JSON.stringify({
    id: 'evt_test_123',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_123',
        object: 'invoice',
        subscription: 'sub_test_123',
        amount_paid: 150000,
        status: 'paid',
        subscription_details: {
          metadata: {
            listingId: 'list_test_123',
            userId: 'u_001'
          }
        }
      }
    }
  });
  
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;

  try {
    const res = await fetch('http://localhost:8080/api/payments/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': header,
        'Content-Type': 'application/json'
      },
      body: payload
    });
    console.log("Status:", res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
testWebhook();
