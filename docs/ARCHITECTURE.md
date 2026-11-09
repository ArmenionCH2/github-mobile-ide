# Architecture

## Product

A GitHub client with a VS Code-style **direct-edit** workspace, NOT a Codespaces runtime. No local clone, build shell, or remote VM.

## Permanent root shell

```
Root Shell (never unmount while switching tabs)
  Account tabs (one per linked GitHub identity; token scoped per account)
    Repository/workspace tabs (per account)
      GitHub view: repository overview, issues, PRs, actions, settings
      IDE view: file explorer, GitHub REST-backed file edits
        File tabs (per repo workspace; draft preserved)
```

Account tab switching must preserve selected repository, selected branch, editor tab, dirty drafts, and scroll where feasible. Tab state is in React memory. Non-secret account labels and layout choices can be stored; no credential storage.

## GitHub API

- Auth is GitHub fine-grained personal access token for the prototype. Token only in memory; account reconnect required on app restart.
- Access through Tauri's HTTP client to `https://api.github.com`.
- GET repo list, branches, directory contents and files on demand.
- Contents API reads/writes text files and checks SHA to detect conflicts.
- Multiple edited files should eventually use Git data (trees/commits/refs) for one atomic commit.
- Display API failures, 403 rate limits, 409 conflicts; never pretend a commit succeeded.
- UI uses account token of containing account tab; never share credential across account contexts.

## Technology

Tauri 2 Android Rust shell; React/TypeScript UI; CodeMirror 6 editor. GitHub REST used directly (no backend). Native HTTPS transport is provided by Tauri HTTP plugin. No remote code execution.

## Security boundaries

- Personal tokens are RAM only, never serialized to localStorage or repo content.
- Use least-privileged fine-grained tokens; account switching cannot bleed authorization.
- Protected branches, permission denials and SSO requirements respected by API.
- Android secure vault and OAuth PKCE are later milestones, not yet implemented.

## Performance

Only open file content fetched; directories lazy loaded; no clone. Memory drafts should be bounded eventually. On mobile, repository navigation collapses to a drawer; root tabs remain present.
