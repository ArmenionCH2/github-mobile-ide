# GitHub Mobile IDE

An Android-first GitHub repository manager with a VS Code-like **direct editor**. It does not clone repositories or run Codespaces.

## How the app is organized

- **Account tabs** switch between GitHub identities, independently retaining their workspaces.
- **Repository navigator** separates All, Owned, Shared/Organizations, Pinned and Recent rather than mixing every repository into one unstructured list. Its sidebar is a drawer in portrait.
- **Projects** are named collections you make inside the repository navigator. Create one, select related repositories (including repositories from different owners and organizations accessible to that account), then open it to see only its members. Edit the name or membership at any time. Removing a project never deletes repositories. Collections are stored on the device, separately for each connected account, and are not GitHub Projects boards.
- **Workspace tabs** preserve separate repository views.
- **IDE file tabs** keep multiple editable files open per repository and commit directly to GitHub.

The GitHub mode includes basic repository administration, issues/PR browsing and Actions. The **Actions** screen can create an initial workflow file using editable starter templates and request manual workflow runs. Advanced features not yet supported by the native screens still need github.com.

## Accounts and security

Connect with a GitHub fine-grained personal access token. The token is kept in Rust process memory during requests and saved encrypted using device-backed secure credential storage, so the app can try restoring it after restart. Account disconnect deletes its saved credential. Tokens are **not** stored in browser localStorage. An invalid or expired token must be reauthorized. For workflow setup, grant Workflows (write); for manual dispatch, Actions (write). Grant only needed repositories and permissions.

The app does not yet implement GitHub OAuth browser sign-in, complete GitHub website feature parity, or tested conflict resolution on a physical phone.

## Building

React, TypeScript, CodeMirror 6, Tauri 2, Rust/reqwest, Android.

```bash
npm install
npm run build
npx tauri android init --ci
npx tauri android build --apk --target aarch64 --ci
```

See [architecture](docs/ARCHITECTURE.md), [status](docs/STATUS.md), [release signing](docs/RELEASE.md), and [AGENTS.md](AGENTS.md).

## APK release signing warning

The GitHub Actions workflow produces an optimized ARM64 release-mode APK. For **install-over-existing updates** and preserved account sessions, set all four persistent signing secrets described in [docs/RELEASE.md](docs/RELEASE.md). Without them, every build uses a throwaway signing key, requiring uninstall between builds and potentially losing stored accounts and drafts. Do not commit signing keys.
