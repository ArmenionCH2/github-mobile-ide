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

## November 9, 2026: release hardening
- Workspace tabs now warn before closing when they contain uncommitted changes.
- Deleting a repository closes its corresponding workspace instead of leaving a stale tab.
- Repository renames update the owning workspace metadata.
- Android build changed from large debug output to optimized release-mode ARM64 APK with alignment, installation signing and artifact verification.
- Release signing uses repository secrets if supplied; otherwise a temporary test key (NOT suitable for seamless upgrades).
- Runtime/install testing on a physical Android device remains unverified.

## Verified release build — November 9, 2026

- GitHub Actions run: https://github.com/ArmenionCH2/github-mobile-ide/actions/runs/42567629602
- Git commit: `26fd4f2c793b72ab934215cab6522f930b65b73f`
- Frontend compile: success.
- ARM64 Tauri/Android release compile: success.
- Android APK zipalign, signing and `apksigner verify`: success.
- Generated APK: `GitHub-Mobile-IDE-v0.2.0-arm64-release.apk`
- Size: 8,288,611 bytes (about 7.9 MiB; 8.29 MB).
- SHA-256: `540a63a696f1e44f0b151ea5d8267f25b4b05aef3a81437b9f1bbc1c521d7978`
- APK archive integrity: verified locally.
- Physical device installation and end-to-end GitHub API interactions: **not tested**.
- This artifact uses test signing when no persistent GitHub secret is configured. Updating a previous build with a different signing certificate requires uninstalling it first.
