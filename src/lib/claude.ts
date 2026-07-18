import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4000;
/** Wall-clock timeout for the full streamed request (10 minutes). */
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 2;

function formatAnthropicError(err: unknown): string {
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (
    err &&
    typeof err === 'object' &&
    'error' in err &&
    err.error &&
    typeof err.error === 'object' &&
    'error' in err.error &&
    err.error.error &&
    typeof err.error.error === 'object' &&
    'message' in err.error.error &&
    typeof (err.error.error as { message?: unknown }).message === 'string'
  ) {
    return (err.error.error as { message: string }).message;
  }

  const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // fall through
    }
  }

  if (/credit balance/i.test(rawMessage)) {
    return 'Anthropic API credit balance is too low. Add credits at console.anthropic.com, then regenerate.';
  }

  if (
    rawMessage === 'Connection error.' ||
    /ECONNRESET|fetch failed|APIConnectionError/i.test(rawMessage)
  ) {
    return 'Could not reach the Anthropic API (connection reset). Please regenerate — long responses now stream to avoid drops.';
  }

  return rawMessage;
}

function isRetryableConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  if (/ECONNRESET|fetch failed|Connection error|APIConnectionError/i.test(msg)) {
    return true;
  }
  if (
    err &&
    typeof err === 'object' &&
    'cause' in err &&
    err.cause instanceof Error &&
    /ECONNRESET|fetch failed/i.test(err.cause.message)
  ) {
    return true;
  }
  return false;
}

async function streamClaudeText(
  client: Anthropic,
  systemPrompt: string,
  maxTokens: number = MAX_TOKENS
): Promise<string> {
  // Streaming keeps the TLS connection active with incremental tokens,
  // avoiding mid-response ECONNRESET on long non-streaming waits (~90s+).
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: systemPrompt }],
    },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  const message = await stream.finalMessage();
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text' || !textBlock.text.trim()) {
    throw new Error('Claude returned no text content');
  }

  return textBlock.text;
}

export async function callClaude(
  systemPrompt: string,
  options?: { maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-key') {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const maxTokens = options?.maxTokens ?? MAX_TOKENS;
  const client = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await streamClaudeText(client, systemPrompt, maxTokens);
    } catch (err) {
      lastError = err;
      const retryable =
        isRetryableConnectionError(err) && attempt < MAX_ATTEMPTS;
      if (!retryable) {
        break;
      }
    }
  }

  throw new Error(formatAnthropicError(lastError));
}

export function parseClaudeJson<T>(raw: string): T {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();
  }

  return JSON.parse(cleaned) as T;
}
