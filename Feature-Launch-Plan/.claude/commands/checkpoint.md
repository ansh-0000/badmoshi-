Create a git safety checkpoint before proceeding with a risky or destructive change: $ARGUMENTS

Stage only what's actually relevant to this checkpoint - respect CLAUDE.md's rules about what
should never be committed (scratch debug scripts, .env, anything with secrets). Do not blindly
run git add -A. If you're unsure what should or shouldn't be staged, list it out and ask before
committing.

Commit with a clear message describing what state is being preserved and why. Report the
commit hash. Do not proceed with the actual risky change until this checkpoint is confirmed
committed.
