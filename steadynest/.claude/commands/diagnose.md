Something is wrong: $ARGUMENTS

Before writing any fix: find and report the actual root cause. Don't guess, don't fix the
symptom, don't swap in a different error message. If the failure point is hidden behind a
generic error/catch block, trace back to what's actually being caught and temporarily log the
real underlying error to find it.

Report the real cause, with evidence (the actual error text, the actual file/line), before
proposing or making any fix.
