# Agent entrypoint

This repository is the authoritative source for GitHub Mobile IDE. Read these files in order:

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): design boundaries and navigation model.
2. [docs/STATUS.md](docs/STATUS.md): what is implemented, not implemented, and not validated.
3. [README.md](README.md): local setup and build.

## Working rules

- Do not claim the app supports an operation unless that operation is wired to GitHub's API.
- Never add fake repository data, demo accounts, or fabricated success messages.
- Keep three independent navigation layers: account tabs, repo/workspace tabs, editor file tabs.
- Preserve drafts across tab switches. Do not overwrite remote changes silently.
- Never persist GitHub tokens in browser localStorage, logs, repository files, or plaintext Android preferences.
- Do not clone repositories for direct editing.
- Prefer smallest possible verifiable changes; keep STATUS.md synchronized.
- Never force-push to a user repo, and require explicit confirmation for destructive settings.
- Keep UI usable in narrow Android portrait and landscape/split-screen.
