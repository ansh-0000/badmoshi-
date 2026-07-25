# SteadyNest — Task Tracker

Solo founder, pre-incorporation, Delhi NCR launch. Four active workstreams. This file is a scratchpad snapshot for this session — it isn't synced to Notion/Asana/Linear/etc. because those connectors aren't authorized yet (do that in claude.ai connector settings, then re-run `/productivity:update` to pull real tasks in).

## 🏗️ Kavya — Engineering (OTP Auth)
- [x] System design doc for Firebase Phone Auth architecture
- [x] Frontend: phone entry + OTP verify screens (Expo Router)
- [x] Backend: Firebase ID token verification + session issuance (Node/Express)
- [x] Postgres schema: users table (phone, firebase_uid, role)
- [ ] Wire screens into existing navigation stack (needs repo access)
- [ ] Load-test OTP endpoint rate limiting before launch
- [ ] Decide: Firebase Phone Auth vs MSG91/Gupshup for India SMS deliverability (see system design doc — flagged risk)

## ⚖️ Rohan — Legal (DPIIT)
- [x] DPIIT eligibility checklist against current Feb 2026 framework
- [x] Draft self-declarations (innovation, no-splitting, turnover)
- [ ] **Blocker: incorporate the company first** — DPIIT recognition requires an existing legal entity. Nothing below can be filed until SPICe+ is done.
- [ ] File on startupindia.gov.in post-incorporation
- [ ] Revisit 80-IAC / IMB application once there's a real financial story

## 📣 Priya — Marketing (Content Calendar)
- [x] 4-week Delhi NCR content calendar, scoped to features that actually work today
- [x] Drafted copy for key posts
- [ ] Push calendar to Sheets / assets to Canva — blocked, connectors not authorized
- [ ] Schedule posts once a social scheduler (Buffer/Later) is connected

## 🎨 Arjun/Design — Design System
- [x] Audit of current UI patterns (dual-role switcher, map+radius, chat, SOS)
- [x] Extend spec for a formal SOS button component
- [ ] Real token audit — needs actual repo/Figma access (Figma connector not authorized)

## Blocked pending connector auth
Drive/Sheets, Canva, GitHub, Figma, Notion, Asana, Linear, Monday, ClickUp, DocuSign. Authorize these in claude.ai connector settings (or `/mcp` in an interactive session) — I can't do this from inside the session, and I won't ask you for tokens/codes.
