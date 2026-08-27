const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.POLLINATIONS_API_KEY;
const MODEL = process.env.POLLINATIONS_MODEL || 'openai';

function reply(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });

  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;

      if (body.length > 1000000) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return reply(res, 204, {});
  }

  if (req.method === 'GET' && req.url === '/health') {
    return reply(res, 200, {
      ok: true,
      provider: 'pollinations'
    });
  }

  if (req.method !== 'POST' || req.url !== '/chat') {
    return reply(res, 404, {
      error: 'Not found'
    });
  }

  if (!KEY) {
    return reply(res, 500, {
      error: 'POLLINATIONS_API_KEY is not configured'
    });
  }

  try {
    const body = await readJson(req);

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const r = await fetch(
      'https://gen.pollinations.ai/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          model: MODEL,
          messages
        })
      }
    );

    const text = await r.text();

    if (!r.ok) {
      return reply(res, r.status, {
        error: text
      });
    }

    const data = JSON.parse(text);

    const content =
      data?.choices?.[0]?.message?.content ?? '';

    return reply(res, 200, {
      reply: content
    });

  } catch (e) {
    return reply(res, 500, {
      error: String(e)
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `RLakkiss AI backend listening on ${PORT}`
  );
});