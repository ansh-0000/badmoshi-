# Repository Reconciliation Plan

## Verified state — 2026-08-04

- Git root: `C:\dev`; runnable tree: `C:\dev\steadynest`.
- `main` at `462c17d8e82ec083fcef3a5f0d1c3d50b632dd0b` tracks the old
  `Feature-Launch-Plan/` layout, while the runnable flat tree is only partially
  tracked.
- The working tree contains 269 pending deletions under `Feature-Launch-Plan/`
  and a large untracked flat tree. Neither an indiscriminate stage nor a clean
  clone recreates the runnable application.
- `steadynest-pg/` is ignored and absent from the current index, but exists in
  Git history. It must not be reintroduced.

## Safe interim operating rule

Do not stage pending `Feature-Launch-Plan/` deletions. Commit only explicitly
named files beneath `steadynest/`, and inspect the staged diff for credentials
before every commit. The root ignore rules protect local environment files,
database data, emulator screenshots, and local Android diagnostic artifacts.

## Reconciliation sequence — proposal only

1. The founder confirms whether any collaborator branch or open pull request
   still depends on the `Feature-Launch-Plan/` path layout.
2. Preserve an independently recoverable copy of the runnable flat tree before
   changing the index. This is an operational backup, not a Git-history rewrite.
3. Add the flat tree in reviewable, explicit-path commits: workspace metadata,
   shared libraries, API, mobile app, tests, then documentation. Do not combine
   generated output, local databases, environment files, or scratch artifacts.
4. Verify a fresh checkout of the newly tracked source can install, migrate and
   start before recording the old-layout deletions.
5. After the founder's branch-compatibility approval, stage the old-layout
   removals in one separately reviewed commit. The exact destructive operation
   is `git add -u -- Feature-Launch-Plan/` (or an equivalent explicit removal);
   it is intentionally not performed now.
6. Treat historic portable-Postgres exposure separately. Removing it from Git
   history requires a founder-approved history rewrite and coordinated
   force-push; a normal commit cannot remove already-pushed data.

## Founder approvals required

- Approval to record the 269 `Feature-Launch-Plan/` deletions once collaborators
  confirm no branch depends on that layout.
- Approval for any Git-history rewrite and coordinated force-push to remove the
  historic portable PostgreSQL data directory.

No deletion, history rewrite, force-push, or tree collapse is authorised by
this plan.
