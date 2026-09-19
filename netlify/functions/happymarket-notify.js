// netlify/functions/happymarket-notify.js
//
// Sends a LINE push message whenever someone submits the HAPPY MARKET
// seller signup form or the AI Match request wizard.
// Reuses the SAME environment variables already configured on this
// Netlify site for the HAPPYSOLAR 50,000 app — no new env vars needed:
//   LINE_CHANNEL_ACCESS_TOKEN
//   LINE_TARGET_USER_ID
//
// Called directly from the browser via:
//   fetch('/.netlify/functions/happymarket-notify', { method:'POST', body: JSON.stringify({...}) })

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_USER_ID;

  if (!token || !targetId) {
    // Env vars not set yet — don't fail the user's form submission over it.
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'LINE env vars not configured' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const formType = data.formType || 'HAPPY MARKET submission';
  delete data.formType;

  const lines = Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const message = `🆕 ${formType}\n${lines}`;

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: 'text', text: message }],
      }),
    });

    const ok = res.ok;
    const resultText = await res.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok, lineStatus: res.status, lineResponse: resultText }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
