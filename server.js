[10:38 pm, 27/08/2026] Unknown: const http = require('http');

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
        resolve(JSON.par…
[10:39 pm, 27/08/2026] Unknown: const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.6-flash';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [800, 1600, 3000];

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askGemini(message) {
  const url =
    https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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

      // Gemini busy / temporary error
      if ((r.status === 429 || r.status === 503) && attempt < MAX_RETRIES) {
        console.log(
          Gemini returned ${r.status}. Retry ${attempt + 1}/${MAX_RETRIES}
        );

        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      if (!r.ok) {
        throw new Error(text);
      }

      const data = JSON.parse(text);

      const content =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || '')
          .join('') || '';

      if (!content) {
        throw new Error('Gemini returned an empty response');
      }

      return content;

    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.log(
          Gemini request failed. Retry ${attempt + 1}/${MAX_RETRIES}
        );

        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Gemini request failed');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return reply(res, 204, {});
  }

  if (req.method === 'GET' && req.url === '/health') {
    return reply(res, 200, {
      ok: true,
      provider: 'gemini',
      model: MODEL
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

          return ${role}: ${content};
        })
        .join('\n');
    }

    if (!message.trim()) {
      return reply(res, 400, {
        error: 'Message is required'
      });
    }

    const content = await askGemini(message);

    return reply(res, 200, {
      reply: content
    });

  } catch (e) {
    console.error('Server error:', e);

    return reply(res, 503, {
      error: 'AI service temporarily unavailable. Please try again.'
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    RLakkiss AI backend listening on ${PORT}
  );
});