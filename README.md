# GitHub Mobile IDE

Android-first GitHub management client and direct-edit IDE.

**Status:** first implementation in progress. Not a complete GitHub desktop replacement or a verified APK yet.

## Product principles

- One persistent app shell with independent account tabs.
- Every account can keep multiple repository/workspace tabs.
- Every repository IDE can keep multiple open file tabs.
- GitHub operations use the official REST API; editing does **not** clone or download entire repositories.
- No Codespaces, server, terminal, or code execution required.
- Explicit GitHub account and branch shown before any write.

## Build

The project uses React, TypeScript, Tauri 2, and a Rust Android shell.

```bash
npm install
npm run dev
npm run build
npm run tauri android init -- --ci
npm run tauri android build -- --apk
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/STATUS.md](docs/STATUS.md) and [AGENTS.md](AGENTS.md) for precise scope.

**Security:** first release uses personal access tokens held in memory during the session, not stored on disk. Use fine-grained, least-privilege tokens; never commit secrets. Proper multi-account OAuth and Android-backed secure token storage remain future work.

## Release APK (Android ARM64)

GitHub Actions builds `v0.2.0` in **release mode**, strips Rust symbols, aligns the APK, and signs it for installation. Download the APK from the `github-mobile-ide-android-arm64-release` Actions artifact.

**Signing key warning:** To create an APK that can be updated without uninstalling, configure the four repository secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. With no secrets the workflow uses a *new throwaway signing key on each build*. Such APKs are installable test releases, but cannot update one another without uninstalling the previous version. Never commit signing keys to this repository.

An optimized APK is **not** evidence of production readiness. GitHub OAuth login, real Android hardware testing, and broader GitHub desktop feature parity remain unfinished.
