import { GoogleGenAI } from '@google/genai';
import env from '../../config/env.js';
import AppError from '../../utils/AppError.js';

let cachedClient = null;
let cachedKey = '';

const getGeminiClient = () => {
  if (!env.geminiApiKey) {
    throw new AppError(
      'AI analysis service is not configured on the server.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  if (!cachedClient || cachedKey !== env.geminiApiKey) {
    cachedClient = new GoogleGenAI({ apiKey: env.geminiApiKey });
    cachedKey = env.geminiApiKey;
  }

  return cachedClient;
};

const stripJsonCodeFence = (rawText) => {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
};

const sanitizeProviderMessage = (rawMessage) => {
  return String(rawMessage || '')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
};

const logDevGeminiDiagnostic = (err) => {
  if (env.nodeEnv !== 'development') return;
  const status = err?.status || err?.statusCode || 'N/A';
  const name = err?.name || 'Error';
  const safeMsg = sanitizeProviderMessage(err?.message);
  console.error(
    `[GeminiService Error] model=${env.geminiModel} name=${name} status=${status} message=${safeMsg}`
  );
};

const mapGeminiError = (err) => {
  if (err instanceof AppError) {
    return err;
  }

  logDevGeminiDiagnostic(err);

  const status = err?.status || err?.statusCode || 0;
  const msg = String(err?.message || '').toLowerCase();

  if (
    status === 404 ||
    msg.includes('not_found') ||
    msg.includes('no longer available') ||
    msg.includes('not found for api version')
  ) {
    return new AppError(
      `Configured Gemini model "${env.geminiModel}" is unavailable. Update GEMINI_MODEL to a supported model such as gemini-3.5-flash.`,
      502,
      'AI_MODEL_UNAVAILABLE'
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied')
  ) {
    return new AppError(
      'AI provider authentication failed. Please contact the administrator.',
      502,
      'AI_AUTH_ERROR'
    );
  }

  if (
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  ) {
    return new AppError(
      'AI service rate limit or quota exceeded. Please try again later.',
      429,
      'AI_RATE_LIMIT'
    );
  }

  if (err?.name === 'AbortError' || msg.includes('timed out') || msg.includes('timeout')) {
    return new AppError(
      'AI analysis timed out. Please try again with a smaller or clearer image.',
      504,
      'AI_TIMEOUT'
    );
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes('unavailable') ||
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound')
  ) {
    return new AppError(
      'AI analysis service is temporarily unavailable. Please try again shortly.',
      503,
      'AI_UNAVAILABLE'
    );
  }

  return new AppError(
    'Unable to complete AI image analysis at this time.',
    502,
    'AI_SERVICE_ERROR'
  );
};

/**
 * Execute a structured-JSON multimodal Gemini call with timeout and safe error handling.
 */
export const generateStructuredVisionJSON = async ({
  imageBuffer,
  mimeType,
  systemInstruction,
  userPrompt,
  responseSchema,
  temperature = 0.1,
}) => {
  const ai = getGeminiClient();
  const base64Image = imageBuffer.toString('base64');
  const timeoutMs = env.geminiTimeoutMs || 30000;

  const controller = new AbortController();
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(
        new AppError(
          'AI analysis timed out. Please try again.',
          504,
          'AI_TIMEOUT'
        )
      );
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: env.geminiModel || 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
          {
            text: userPrompt,
          },
        ],
        config: {
          abortSignal: controller.signal,
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature,
        },
      }),
      timeoutPromise,
    ]);

    const rawText = response?.text;
    if (!rawText || typeof rawText !== 'string') {
      throw new AppError(
        'AI returned an empty response.',
        502,
        'AI_MALFORMED_RESPONSE'
      );
    }

    try {
      return JSON.parse(stripJsonCodeFence(rawText));
    } catch {
      throw new AppError(
        'AI returned malformed structured data.',
        502,
        'AI_MALFORMED_RESPONSE'
      );
    }
  } catch (err) {
    throw mapGeminiError(err);
  } finally {
    clearTimeout(timeoutId);
  }
};
