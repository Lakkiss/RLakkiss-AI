const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.6-flash';

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
        reject(new Error('Request too large'));
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
      provider: 'gemini'
    });
  }

  if (req.method !== 'POST' || req.url !== '/chat') {
    return reply(res, 404, {
      error: 'Not found'
    });
  }

  if (!KEY) {
    return reply(res, 500, {
      error: 'GEMINI_API_KEY is not configured'
    });
  }

  try {
    const body = await readJson(req);

    let message = '';

    if (typeof body.message === 'string') {
      message = body.message;
    } else if (Array.isArray(body.messages)) {
      message = body.messages
        .map(m => {
          const role = m.role || 'user';
          const content =
            typeof m.content === 'string'
              ? m.content
              : '';

          return `${role}: ${content}`;
        })
        .join('\n');
    }

    if (!message.trim()) {
      return reply(res, 400, {
        error: 'Message is required'
      });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: message
              }
            ]
          }
        ]
      })
    });

    const text = await r.text();

    if (!r.ok) {
      return reply(res, r.status, {
        error: text
      });
    }

    const data = JSON.parse(text);

    const content =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('') || '';

    return reply(res, 200, {
      reply: content
    });

  } catch (e) {
    console.error(e);

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