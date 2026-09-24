# Straw Hat Timer — CONTEXT.md

Memory bank for AI sessions. Mechanical rules (commands, IDs, contracts)
live in `AGENTS.md` — read that too. This file is the *what and why*.

## Project Overview

A One Piece-themed Pomodoro: sail focus voyages (default 25 min) with a
chosen crewmate (Luffy, Zoro, Nami, Sanji), earn berries per completed
voyage, rest on short/long breaks, post bounty tasks on a WANTED board,
and track consistency on a voyage LOGBOOK heatmap. Single static page,
all state in localStorage, no backend, no login.

## Tech Stack

Vanilla HTML + CSS + JavaScript only — `index.html`, `style.css`,
`script.js`. No frameworks, no bundler, no dependencies (Google Fonts
via CDN is the sole external load). Keep it that way.

## Design System & Theme

- **Two worlds:** deep-ocean glass (`--night`/`--night-2`, blur cards,
  foam text) for the timer side; aged parchment (`--paper`, double
  borders, tape strips) for the bounty board + logbook column.
- **Voice:** pirate, never corporate. Voyages not sessions, berries not
  points, logbook not activity graph, "Set sail" / "Drop anchor" /
  "Skip island". Sentence case, playful but plain.
- **Crew theming:** `body[data-crew]` drives `--crew`/`--crew-deep`
  (Luffy red, Zoro green, Nami orange, Sanji blue). New color accents
  must flow through these vars so crew switches recolor with no JS.
- **Type:** Pirata One for brand/poster display only; Nunito (300–900)
  for everything else, tabular numerals for the timer.
- **Signature details:** thin 6px progress ring, crew-tinted heat cells
  via `color-mix()`, 7px dark-wood logbook scrollbar, cinematic crew
  photo behind a dark scrim. Restraint elsewhere — one bold element
  per change.
- **Floor:** responsive to 360px, visible focus, reduced-motion
  respected, touch-sized controls.

## AI Coding Guidelines

- Clean, modular vanilla JS: small named functions, no globals beyond
  the existing timer/history/task stores, defensive `try/catch`
  around every localStorage access.
- No external frameworks or libraries — a `<script src>` addition
  needs explicit user approval first.
- Every user-facing number or label touched by a setting must update
  live (e.g. `syncFooter()` mirrors duration inputs; `renderHeatmap()`
  re-renders on session finish). No static text that duplicates a
  value stored elsewhere.
- Match the existing vibe before inventing: reuse parchment/glass
  skins, crew vars, and pirate vocabulary; check `AGENTS.md`
  layout contracts before resizing anything.
