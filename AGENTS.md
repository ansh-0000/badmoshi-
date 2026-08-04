# Wrong directory — the project is in `steadynest/`

`C:\dev` is the **git root**, not the project root. If an agent was launched here, move to:

```
C:\dev\steadynest
```

and read **`C:\dev\steadynest\AGENTS.md`**, which is the real standing-context file.

`C:\dev` also holds `steadynest-pg/` (a **running PostgreSQL data directory** — never stage
anything under it), `steadynest-mobile-ui-design/`, and files still tracked under an old
`Feature-Launch-Plan/` prefix that are pending a layout migration. None of those are the app.

Git works normally from inside `steadynest/` — it walks up to find `.git` here.
