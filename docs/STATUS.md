# Implementation status (2026-11-09)

This document distinguishes implemented source from verified builds. Do not describe untested functions as production-ready.

## Implemented in repository source

- Rust-powered Tauri 2 Android shell with a React/TypeScript interface and CodeMirror editor.
- Persistent GitHub account tabs, independent per-account workspace tabs, and per-workspace editor file tabs.
- GitHub personal-token connections held only in process memory (no plaintext persisted secrets).
- Listing and navigating accessible repositories; creating repositories.
- Branch browsing and creation; on-demand directory and UTF-8 text file reads.
- Creating/editing/renaming/deleting text files as pending changes.
- Multi-file direct GitHub commits using Git blobs, trees and refs without cloning; source SHA conflict checks and non-forced ref updates.
- Basic GitHub repository pages, issues, PRs, Actions and repository controls; some advanced screens open the official website.
- Android debug APK GitHub Actions workflow.

## Validation

- GitHub repository files are present and inspectable.
- Android CI workflow is currently being exercised; a successful Android compilation, install and device smoke test have NOT been recorded here.
- Do not link or claim an APK until an actual artifact is verified.

## Not yet implemented / known limitations

- Full parity with every GitHub website setting and administrative flow.
- GitHub OAuth PKCE and secure Android keystore-backed credential persistence. Users currently reconnect tokens after app restart.
- Background sync, offline durable draft recovery after Android process termination.
- Git merge/rebase workflows, language servers, terminal, compilation and runtime (out of scope for direct edit).
- Full conflict resolution UI and automated tests on physical phones.
- Binary files, Git LFS and very large text files are not supported as editable text.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) and [AGENTS.md](../AGENTS.md). Keep this status current and avoid placeholders/fake data.
