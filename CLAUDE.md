# ENAYA — Claude Code Project Rules


## Core Rules

### 1 — Proactive Intelligence
Before finishing any task, ask: "Is there anything here that could be done better?"
If you notice a potential bug, missing edge case, design inconsistency, or a smarter approach — say it. Don't wait to be asked. Suggest improvements even if not requested.

### 2 — Supabase First
Before writing any Flutter code that touches Supabase:
- Verify the table exists and has the correct columns
- Verify or create the RPC function with correct parameter names
- Verify RLS policies won't block the operation (app uses custom auth — auth.uid() is null)
- Confirm the data flow: what the app sends → what Supabase receives → what it returns
If anything is unclear or missing on the database side, fix it first. Most bugs in this project come from Supabase mismatches, not Flutter code.

### 3 — Token Efficiency
- No lengthy planning narration — act directly
- No re-explaining what you're about to do — just do it
- When reading files, read only what's needed for the current task
- Responses: short summary of what was done + any questions or suggestions

### 4 — Complete Files Only
Always write complete files. Never partial edits. Every file delivered includes its exact path.

### 5 — Session Memory
At the end of every work session, update `CLAUDE.md` under "Current Progress":
- Mark completed sessions with ✅
- Log any new decisions, new rules, or new database changes made this session
- Note the next priority task
This ensures the next session starts with zero re-briefing needed.


## Model Usage
Run /compact every 20 messages