# Straw Hat Timer — agent notes

Static single-page One Piece pomodoro. No build, no tests, no bundler.
Files: `index.html`, `style.css`, `script.js`, `assets/images/*.jpg`,
`assets/*.wav` (real WAV data — never rename `.wav` files to `.mp3`).

## Verify

- `node --check script.js` after any JS edit. No test suite exists.
- Open `index.html` directly to eyeball changes (Google Fonts need network).

## State (localStorage)

- Keys: `op-crew`, `op-tasks`, `op-completed` (lifetime total), `op-history`
  (`{"YYYY-MM-DD": n}`, per-day focus counts, local day via `dayKey()`),
  `op-migrated-<uid>` (one-time cloud migration flag),
  `op-promo-day` (`YYYY-MM-DD` of last promo dismiss/signup; promo
  shows once per day to guests only).
- Logged out = localStorage only. Logged in = localStorage stays as cache,
  Supabase (`profiles`, `history`, `tasks` tables) is source of truth.
- `op-history` is append-only fresh-start data; never backfill or reset it.
- Clear these keys when testing first-run/empty states.

## Behavior contracts (don't "fix" these)

- `finishSession(true)` = Skip island: advances timer/rest cycle but records
  nothing (no berry, no heatmap cell). Only un-skipped focus sessions call
  `recordVoyage()`.
- Heatmap is a rolling 26-week window ending today + trailing-364-day header
  count. No calendar years, no year switcher — by design.
- The 30-day crew lock is enforced by a Postgres RLS policy, not JS.
  `applyCrew()` only mirrors it (countdown via `lockDays()`); never
  weaken the gate client-side.
- Anon key is public by design (ships in `script.js`); `service_role`
  must never enter the repo or chat.
- Never commit `session-ses_*.md` (gitignored session log).

## Layout constraints

- Right column (`.board-col`) content is ~440px wide. The heatmap grid is
  fixed at 423px (26 weeks × 15px pitch + gutter) — widening cells/weeks
  breaks the card; the horizontal scrollbar only appears below ~460px
  viewports, which is why it is thin-styled rather than removed.
- Crew theming flows through `body[data-crew]` + `--crew`/`--crew-deep`;
  heat levels use `color-mix()` so crew switches recolor with no JS.
- IDs shared between HTML/JS: `logGrid`, `logMonths`, `logCount`,
  `footFocus`, `footShort`, `inFocus`, `inShort`, `inLong`, `sceneImg`,
  `accountBtn`, `authDialog`, `authEmail`, `authPass`, `authUser`,
  `authGo`, `authTabIn`, `authTabUp`, `authErr`, `authName`, `authEdit`,
  `authEditRow`, `authEditInput`, `authEditSave`, `authEditCancel`,
  `authEye`, `authForgot`, `authRecover`, `authRecEmail`, `authRecErr`,
  `authRecGo`, `authBackLogin`, `authResetView`, `authNewPass`,
  `authResetErr`, `authSavePass`, `promoModal`, `promoSignup`,
  `promoLater`, `crewLock`. Rename on both sides or neither.
- Fonts are Nunito (+300) and Pirata One only. DotGothic16 and the
  dashed straw-ring decor were deliberately removed — don't reintroduce.

## Assets & git

- Crew photos must be lowercase `assets/images/{luffy,zoro,nami,sanji}.jpg`.
  Windows treats `Sanji.jpg`/`sanji.jpg` as one file — renames have
  destroyed files before; verify with `Test-Path` after touching them.
- Branch `main`, remote `origin`. Commit messages: `feat:`/`style:` prefix.
