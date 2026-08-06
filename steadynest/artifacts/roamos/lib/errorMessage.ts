/**
 * Turns any thrown error into a safe, user-facing message. This is the one
 * place error text should be converted for display — raw error objects,
 * stack traces, or debug strings (e.g. "CLIENT ERROR LOG: ...") must never
 * be rendered directly in the UI anywhere in the app.
 *
 * Logs the real error for developers (console today; this is the single
 * seam to wire into Sentry later) and returns a friendly fallback instead.
 * Never logs or returns request bodies, tokens, or other sensitive payloads
 * — only the error's own message/stack.
 */
/**
 * Marks an error's message as already sanitized and safe to show verbatim —
 * i.e. it's the backend's own error body (e.g. "Invalid email or
 * password."), not a raw JS/native exception message. Thrown by lib/api.ts
 * and any other call site that parses a `{ error: string }` response body.
 * toFriendlyError() only ever passes through messages from errors of this
 * type; a plain Error (a TypeError, a native-module crash, etc.) always
 * falls back to a generic message instead of leaking its raw text.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toFriendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error) {
    console.error('[error]', err.message);

    // A thrown fetch (Chrome/web: "Failed to fetch"; native: "Network
    // request failed") means the request never reached the server at all —
    // distinct from the server responding with an error body.
    if (/network|failed to fetch|fetch failed/i.test(err.message)) {
      return "Can't reach the server. Check your connection and try again.";
    }
    if (/timeout/i.test(err.message)) {
      return 'That took too long. Please try again.';
    }

    // Only ApiError carries a message we've already sanitized (the
    // backend's own error body) — safe to surface as-is. Any other Error,
    // including raw runtime/native exceptions, must never be shown verbatim.
    if (err instanceof ApiError && err.message && err.message !== 'Request failed' && err.message !== 'Failed') {
      return err.message;
    }
  } else {
    console.error('[error]', err);
  }

  return fallback;
}
