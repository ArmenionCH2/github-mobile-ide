# Status / truth source

## In scope for first implementation

- Tauri 2 / React / TypeScript project and Android debug-build GitHub Actions.
- Persistent account tabs, nested repo tabs, file tabs.
- GitHub API account token connection, repository listing, browsing and code editing.
- Direct file commits via GitHub Contents API with SHA conflict protection.
- Lightweight GitHub repository view.
- Account/session state in memory to avoid plaintext credential persistence.

## Explicitly not finished / not claimed

- Full feature parity with GitHub desktop website (security/account settings, all GitHub actions).
- GitHub OAuth PKCE and OS encrypted credential vault.
- Offline edits surviving app termination.
- Full multi-file atomic staging/commit, merge conflict resolution.
- Android APK verification on real device or build success until CI is green.
- Web IDE runtime, language servers, terminal, or Codespaces (out of scope).

Always update this file after implementation or validation.
