# Implementation status

## November 13, 2026 — v0.4.0 Projects

- The repository navigator has a Projects section on desktop and in the Android drawer, with a direct Projects button on narrow screens.
- Create, open, rename and remove named collections, and add or remove accessible repositories using a searchable picker. Collections persist on the current device, independently per GitHub account. They do not create or change GitHub Projects or remote repositories.
- Stable repository IDs keep membership attached across renames. Missing repositories remain listed and can be removed from the collection.

### Verified v0.4.0 Android ARM64 release

- Source commit: `d58e333148ddb3daf4b7910a1c9ebf84970e0dd9`.
- [Successful GitHub Actions run](https://github.com/ArmenionCH2/github-mobile-ide/actions/runs/43421366688) and [release APK artifact](https://github.com/ArmenionCH2/github-mobile-ide/actions/runs/43421366688/artifacts/14034672254).
- Tests, TypeScript build, Android release compile, alignment, signing and APK signature verification passed.
- Downloaded artifact and APK ZIP integrity verified. `GitHub-Mobile-IDE-v0.4.0-arm64-release.apk` is 8,329,571 bytes and contains only the ARM64 native library. SHA-256: `428d5cdaf959604283e73d5cd4387fe2f10d0c2535d5b27143b6ac254d8b57f1`.
- Chromium smoke-tested Projects on phone-sized and desktop viewports with stubbed Tauri/GitHub responses. Physical Android installation and real-device interaction were not tested.
- This run used an ephemeral signing key and cannot update an APK signed by another certificate in place.

## Initial implementation (November 9, 2026)

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

## November 10, 2026 — navigation, accounts, and Actions

- Repository dashboard is separated into an account-scoped sidebar with All, Owned, Shared/Organizations, Pinned, and Recent sections. Pins and recents store non-secret repository names only.
- Personal access tokens are stored encrypted with Android Keystore-backed secure storage instead of plaintext localStorage, and the app restores valid sessions on launch.
- The Actions page can create actual workflows from editable starter templates when none exist; workflow creation requires GitHub Workflows (write) permission. Existing workflows show run controls for manual dispatch (requires workflow_dispatch).
- OAuth browser authorization is not yet implemented. Users initially authorize using a fine-grained GitHub token.
- Persistent session behavior still needs a physical Android device smoke test.
- **APK signing:** GitHub Actions uses a temporary signing certificate unless all four persistent signing secrets are set. Apps signed by different keys cannot be installed as in-place updates; existing app data, including saved accounts, may be lost if uninstall is required.
- Full desktop website parity remains out of scope for this release; many advanced GitHub operations still link to the official site.

## Verified v0.3.0 Android ARM64 build — November 10, 2026

- Source commit: `c4260f6e6a91a4af3624177faec8e755fb5d2fbe`; documentation may have newer commits.
- Successful CI run: https://github.com/ArmenionCH2/github-mobile-ide/actions/runs/42756455127
- GitHub artifact: https://github.com/ArmenionCH2/github-mobile-ide/actions/runs/42756455127/artifacts/13735514539
- Release-mode TypeScript, Rust/Android compilation, zipalign, APK signing and signature verification: **passed**.
- Actual APK: `GitHub-Mobile-IDE-v0.3.0-arm64-release.apk` — **8,329,571 bytes (8.33 MB)**.
- Local APK ZIP integrity and downloaded artifact archive: **verified**.
- APK SHA-256: `8fb2c315aed77565a2129029182d85380e522dae513e9252bcd90e5c09d112b2`.
- Physical-phone installation, session restoration and GitHub workflow-creation end-to-end testing: **not yet tested**.
- Until a permanent keystore is configured in GitHub Secrets, the release is test-signed and **cannot upgrade previous APK signatures in place**.
