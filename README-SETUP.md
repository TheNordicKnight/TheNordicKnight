# One-time setup

These steps only need to be run once. After they're done, the profile updates itself.

## 1. Create the GitHub repo

GitHub treats a repo whose name **exactly equals your username** as a special "profile" repo — its `README.md` renders at `https://github.com/TheNordicKnight`.

1. On GitHub, create a new repo named `TheNordicKnight` (public, no template).
2. Do **not** let GitHub initialize it with a README — we already have one.

## 2. Push this folder as the initial commit

From this directory (`C:\Users\Nordic Knight\Projects\TheNordicKnight`):

```powershell
git init -b main
git add .
git commit -m "init: profile README + automation"
git remote add origin https://github.com/TheNordicKnight/TheNordicKnight.git
git push -u origin main
```

## 3. Trigger the summary-cards workflow for the first time

The workflow runs daily, but you don't want to wait until 03:17 UTC to see the cards.

1. Open the repo on GitHub → **Actions** tab.
2. Pick **GitHub Profile Summary Cards** → **Run workflow** → `main` → **Run**.
3. After it finishes green, you'll see SVGs committed under `profile-summary-card-output/`.

## 4. Generate the first Claude usage card

From the repo root:

```powershell
pwsh scripts/update-claude-usage.ps1
```

This runs `ccusage`, writes `claude-usage/card.svg`, and pushes the commit. Open the SVG in a browser to sanity-check the styling.

## 5. Schedule the usage card to refresh nightly

Windows Task Scheduler, one-time:

1. Open **Task Scheduler** → **Create Task…**
2. **General**: name it `TheNordicKnight-ClaudeUsage`. Check *Run whether user is logged on or not*.
3. **Triggers**: New → Daily → pick a time (e.g. 02:00 local).
4. **Actions**: New →
   - *Program/script*: `pwsh.exe` (or `powershell.exe` if you don't have PS 7)
   - *Add arguments*: `-NoProfile -ExecutionPolicy Bypass -File "C:\Users\Nordic Knight\Projects\TheNordicKnight\scripts\update-claude-usage.ps1"`
   - *Start in*: `C:\Users\Nordic Knight\Projects\TheNordicKnight`
5. **Conditions**: uncheck "Start the task only if the computer is on AC power" if you want it to run on battery.
6. Save. You'll be prompted for your Windows password so it can run unattended.

To confirm it works before leaving: right-click the task → **Run**. Check the repo's commit history for a fresh `chore: update claude usage card` commit.

## 6. Fill in the placeholders in `README.md`

- Replace the tagline line.
- Replace `YOUR_HANDLE` in the Mastodon badge.
- Replace `YOUR-SITE.example` with your real site URL, or delete the badge.

## Troubleshooting

- **Cards don't appear on the profile page.** GitHub's image proxy (camo) caches aggressively. Hard-refresh, or append `?v=2` to the image URLs in `README.md`. Allow a few minutes after the first push.
- **`ccusage` finds no data.** It reads `~/.claude/projects/**/*.jsonl`. If the path is non-default, set `CLAUDE_CONFIG_DIR` before invoking the script. See [ccusage README](https://github.com/ryoppippi/ccusage).
- **Summary-cards workflow fails with rate-limit.** It uses `GITHUB_TOKEN` automatically — if limits still bite, you can swap in a classic PAT stored as secret `GH_PAT` and pass it as the `GITHUB_TOKEN` env var.
- **Task Scheduler silently fails.** Check `Event Viewer → Windows Logs → Application` for the scheduled task result, or add `Start-Transcript -Path "$env:TEMP\claude-usage.log"` to the top of `update-claude-usage.ps1` to capture output.
