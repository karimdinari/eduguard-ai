# eduGuard-AI

**A multi-agent AI system for supervised coding labs.**

---

## The Problem

In fundamental subjects — algorithms, databases, OOP, systems — lab sessions are often the only moment where students are supposed to actually write code. But in practice? Copy-pasting from the internet, ChatGPT, or the person next to them has become the default reflex. The submission looks perfect. The understanding is zero.

This isn't occasional cheating. It's a structural problem that robs students of the fundamentals they'll need their entire career. A student who has never genuinely written a loop, implemented a JPA relationship, or debugged a NullPointerException on their own shows up to an internship or job without the basics.

**eduGuard-AI is our answer to this problem.**

Upload a lab PDF → get an interactive IDE in the browser. Students work through each question one by one while a pipeline of **3 specialized AI agents** evaluates their code in real time, detects suspicious submissions, and delivers a final argued grade — all without human intervention.

---

# 🎥 Project Demo Video

## 📺 Watch the YouTube Video

[![Watch the video](https://img.youtube.com/vi/48FaQLjrRAQ/0.jpg)](https://www.youtube.com/watch?v=48FaQLjrRAQ)
---

## Multi-Agent Architecture

Three autonomous agents, each with a precise role, collaborate throughout the session:

**Agent A — Context & Decomposition**
Parses the uploaded PDF and extracts every question, part, objective, and constraint into structured JSON. Supports code, fill-in-the-blank completion, and theory questions.

**Agent B — Real-time Evaluator & Anti-Cheat**
Evaluates each submitted answer instantly. Detects suspicious patterns (too fast, suspiciously perfect, style inconsistency, above expected level) and blocks the student with a Socratic verification question before accepting. All signals accumulate into a session risk score.

**Agent C — Final Grader**
At submission, reads the full session — all code, all exchanges, all risk signals — and produces a grade out of 20 with a detailed breakdown across correctness, code quality, understanding, process, and originality. Penalizes heavily for high risk scores.

---

## Key Features

- **PDF → interactive lab in seconds** — powered by Gemini 2.5 Flash
- **VS Code-style IDE** with file explorer, tabs, breadcrumbs, and per-question code editors
- **Completion questions** with inline fill-in-the-blank inputs directly inside syntax-highlighted code
- **Locked progression** — parts unlock only after every question in the current part is accepted
- **Socratic verification modal** — blocks submission until the student proves understanding in their own words
- **Cumulative risk score** across the session, factored directly into the final grade
- **Per-question timer** fed to Agent B for time-based anomaly detection
- **Copy/paste blocked** in all editors to enforce original typing
- **Final evaluation** with grade, detailed AI feedback, and concrete improvement suggestions
- **Bootstrap API** — labs can also be injected as structured JSON without any PDF

---

## Stack

**Backend** — FastAPI · Python · Google Gemini 2.5 Flash · PyMuPDF

**Frontend** — React 19 · TanStack Router · Tailwind CSS v4 · Framer Motion · shadcn/ui · Vite

---

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key" > .env
uvicorn main:app --reload

# Frontend
cd front
bun install
bun dev
```

Open `http://localhost:5173`, upload a lab PDF, and start the session.
