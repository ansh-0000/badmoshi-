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
export function toFriendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error) {
    console.error('[error]', err.message);

    // A thrown fetch (TypeError on web, "Network request failed"/"fetch
    // failed" on native) means the request never reached the server at all
    // — distinct from the server responding with an error body.
    if (/network|fetch failed|Network request failed/i.test(err.message)) {
      return "Can't reach the server. Check your connection and try again.";
    }
    if (/timeout/i.test(err.message)) {
      return 'That took too long. Please try again.';
    }

    // Errors thrown by lib/api.ts already carry the backend's own sanitized
    // message (e.g. "Invalid email or password.") — safe to surface as-is
    // since the server never returns raw internals in these.
    if (err.message && err.message !== 'Request failed') {
      return err.message;
    }
  } else {
    console.error('[error]', err);
  }

  return fallback;
}
