# StayOnTrack 🔒

### The to-do list you literally cannot lie to.

StayOnTrack is an AI accountability companion built for the **Vibe2Ship** hackathon (Problem Statement 1 — *The Last-Minute Life Saver*). Instead of passive reminders you can ignore, every task requires **photo/screenshot proof of completion**, and a **Gemini multimodal agent contextually verifies** whether the evidence genuinely proves that specific task was done — accepting real proof, rejecting blank/unrelated/mismatched images, and explaining its verdict in plain English.

**🔗 Live app:** https://stayontrack-745961634930.asia-southeast1.run.app

---

## The problem

Students, professionals, and entrepreneurs miss deadlines not because they lack reminders, but because reminders are **passive and easy to lie to**. Honor-system to-do apps trust you blindly; money-stake accountability apps use black-box AI that rubber-stamps weak proof. StayOnTrack closes that gap.

## What makes it different

StayOnTrack owns an unclaimed position: **strict, contextual, *explained* verification — with the proof itself as the stake instead of money.** A confident, well-explained verdict is the centerpiece of the experience, not a silent checkbox.

## Key features

- **Natural-language task capture** — describe a task in plain English; Gemini extracts a structured title, deadline, and priority (resolving relative dates).
- **Proof-of-completion verification (core)** — a Gemini multimodal agent judges photo evidence against the task and returns a structured verdict (accepted/rejected, confidence, matched evidence, reason), rendered as a full-screen verification ceremony with visible reasoning.
- **Forensic verdict experience** — scan-line analysis over the proof image, streaming chain-of-reasoning, calibrated High/Medium/Low confidence, and a decisive VERIFIED / REJECTED result.
- **Anti-cheat integrity** — rejects blank, unrelated, and duplicate images; verification cannot be bypassed.
- **Autonomous AI Daily Plan** — Gemini time-blocks the day with explicit reasoning.
- **Autonomous escalation** — for overdue/unproven tasks, the agent re-plans, re-blocks time, and raises urgency.
- **Daily ritual loop** — a morning plan plus an evening "Verification Reckoning" that tallies proven vs. unproven and updates the streak.
- **Accountability dashboard** — animated commitment ring, flame streak, proven-vs-rejected ledger, and a GitHub-style Integrity Grid ("every green square is a photo you actually took").
- **Resilient AI layer** — retry with exponential backoff and graceful, on-brand handling of transient API load.
- **Voice input** — hands-free task capture.

## Tech stack

- **Front end:** React (single-page)
- **Backend:** Node server API layer (proxies Gemini calls, holds the API key)
- **Persistence:** browser localStorage
- **AI:** Google Gemini (multimodal vision + structured JSON output)
- **Build & deploy:** Google AI Studio → Google Cloud Run

## Google technologies utilized

| Technology | How it is used |
|---|---|
| **Google AI Studio** | Core tool — used to build, iterate on, and deploy the app |
| **Gemini API** | Natural-language task parsing, daily planning, escalation |
| **Gemini Multimodal (Vision)** | Image-based proof-of-completion verification (core feature) |
| **Gemini Structured Output** | JSON-schema responses for reliable task data and verdicts |
| **Google Cloud Run** | Hosting for the publicly deployed application |

## How it works

1. Add a task in natural language ("Submit DBMS assignment by 3pm tomorrow").
2. When the deadline nears, tap **Submit Proof** and provide a photo/screenshot.
3. The Gemini multimodal agent reads the image's content *contextually against your task* and returns a verdict with its reasoning.
4. **Verified** → streak increments, a green square fills the Integrity Grid. **Rejected** → a specific reason and a Retake path. No proof, no completion.

## Running / building

This project was built and is deployed using **Google AI Studio**. To run or extend it, open the project in Google AI Studio (or export the source), then provide a Gemini API key from a billing-enabled Google Cloud project (the free tier may have zero quota for some models).

```
# environment
GEMINI_API_KEY=your_key_here   # server-side; never commit real keys
```

> ⚠️ Never commit your real API key. Use an environment variable / secret.

## License

MIT — see [LICENSE](LICENSE).
