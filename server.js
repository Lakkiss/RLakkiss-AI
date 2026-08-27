const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.6-flash';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [800, 1600, 3000];

function reply(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });

  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;

      if (body.length > 15000000) {
        req.destroy();
        reject(new Error('Request too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildInput(body) {
  const parts = [];

  if (Array.isArray(body.messages)) {
    const history = body.messages
      .filter(
        message =>
          message &&
          typeof message.content === 'string' &&
          message.content.trim()
      )
      .map(message => {
        const role =
          message.role === 'assistant'
            ? 'Assistant'
            : 'User';

        return `${role}: ${message.content}`;
      })
      .join('\n\n');

    if (history) {
      parts.push({
        text: history
      });
    }
  }

  if (
    typeof body.message === 'string' &&
    body.message.trim()
  ) {
    parts.push({
      text: body.message.trim()
    });
  }

  if (Array.isArray(body.attachments)) {
    for (const attachment of body.attachments) {
      if (
        attachment &&
        typeof attachment.data === 'string' &&
        attachment.data.length > 0 &&
        typeof attachment.mimeType === 'string'
      ) {
        parts.push({
          inline_data: {
            mime_type: attachment.mimeType,
            data: attachment.data
          }
        });
      }
    }
  }

  return parts;
}

function extractText(data) {
  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  const steps = Array.isArray(data?.steps)
    ? data.steps
    : [];

  const texts = [];

  for (const step of steps) {
    const content = Array.isArray(step?.content)
      ? step.content
      : [];

    for (const item of content) {
      if (
        item &&
        item.type === 'text' &&
        typeof item.text === 'string'
      ) {
        texts.push(item.text);
      }
    }
  }

  return texts.join('').trim();
}

async function askGemini(input) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': KEY
        },
        body: JSON.stringify({
          model: MODEL,
          input: input
        })
      });

      const raw = await response.text();

      if (
        (response.status === 429 ||
          response.status === 503) &&
        attempt < MAX_RETRIES
      ) {
        console.log(
          `Gemini returned ${response.status}. Retry ${
            attempt + 1
          }/${MAX_RETRIES}`
        );

        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Gemini HTTP ${response.status}: ${raw}`
        );
      }

      const data = JSON.parse(raw);
      const text = extractText(data);

      if (!text) {
        throw new Error(
          'Gemini returned an empty response'
        );
      }

      return text;
    } catch (error) {
      console.error(
        `Gemini attempt ${attempt + 1} failed:`,
        error.message
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Gemini request failed');
}

const server = http.createServer(
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      return reply(res, 204, {});
    }

    if (
      req.method === 'GET' &&
      req.url === '/health'
    ) {
      return reply(res, 200, {
        ok: true,
        provider: 'gemini',
        model: MODEL
      });
    }

    if (
      req.method !== 'POST' ||
      req.url !== '/chat'
    ) {
      return reply(res, 404, {
        error: 'Not found'
      });
    }

    if (!KEY) {
      return reply(res, 500, {
        error:
          'GEMINI_API_KEY is not configured'
      });
    }

    try {
      const body = await readJson(req);
      const input = buildInput(body);

      if (!input.length) {
        return reply(res, 400, {
          error: 'Message is required'
        });
      }

      const result = await askGemini(input);

      return reply(res, 200, {
        ok: true,
        model: MODEL,
        reply: result
      });
    } catch (error) {
      console.error(
        'Server error:',
        error
      );

      return reply(res, 503, {
        ok: false,
        error:
          'AI service temporarily unavailable.'
      });
    }
  }
);

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `RLakkiss AI backend listening on ${PORT}`
    );
  }
);