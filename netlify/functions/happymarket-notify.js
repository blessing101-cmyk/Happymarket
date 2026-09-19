// netlify/functions/happymarket-notify.js
//
// Sends a LINE push message whenever someone submits the HAPPY MARKET
// seller signup form or the AI Match request wizard.
// Reuses the SAME environment variables already configured on this
// Netlify site:
//   LINE_CHANNEL_ACCESS_TOKEN
//   LINE_TARGET_USER_ID
//
// This version logs detailed debug info so issues show up in
// Netlify → Functions → happymarket-notify → Function log.

exports.handler = async (event) => {
  console.log('--- happymarket-notify invoked ---');
  console.log('HTTP method:', event.httpMethod);

  if (event.httpMethod !== 'POST') {
    console.log('Rejected: not a POST request');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_USER_ID;

  console.log('LINE_CHANNEL_ACCESS_TOKEN present:', !!token, token ? `(length ${token.length})` : '');
  console.log('LINE_TARGET_USER_ID present:', !!targetId, targetId || '');

  if (!token || !targetId) {
    console.log('Missing env vars — skipping LINE push');
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'LINE env vars not configured' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
    console.log('Parsed request body:', JSON.stringify(data));
  } catch (err) {
    console.log('JSON parse error:', err.message);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const formType = data.formType || 'HAPPY MARKET submission';
  delete data.formType;

  const lines = Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const message = `🆕 ${formType}\n${lines}`;
  console.log('Message to send:', message);

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

    const resultText = await res.text();
    console.log('LINE API status:', res.status);
    console.log('LINE API response body:', resultText);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: res.ok, lineStatus: res.status, lineResponse: resultText }),
    };
  } catch (err) {
    console.log('Fetch to LINE API threw an error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
