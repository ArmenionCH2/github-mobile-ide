# Architecture

## Product

Native-shell GitHub client + direct-edit IDE. Not a Codespaces runtime, Git clone, VM, compiler or terminal.

## Persistent navigation

```text
Root app shell
  GitHub account tabs (separate credentials, independent state)
    Repository navigator
      Projects (local named collections)
      All / Owned / Shared and organizations / Pinned / Recent
    Workspace tabs (each repository)
      GitHub: overview / issues / PRs / Actions / settings
      IDE: file explorer / file tabs / staged changes / commits
```

On Android portrait, the repository navigator is a drawer. Projects, pins and recent names are stored locally as **non-secret metadata** scoped to a GitHub account. Project members use stable GitHub repository IDs, so renames and transfers within the account’s access do not break membership. Temporarily unavailable members are preserved without opening another account’s repository or dropping it from the collection. Open editor drafts remain memory-resident; Android may terminate the process and discard uncommitted edits.

## Authentication and API

- Fine-grained personal access tokens are entered once, then saved through an Android Keystore-backed encrypted credential plugin. On restart the app attempts to reconnect saved accounts. Disconnect deletes the saved record.
- The React UI briefly holds a token during initial connect or session restoration, but authenticated HTTP requests and live per-account sessions are handled by Rust via reqwest.
- No plaintext access token in localStorage, preferences or repository.
- GitHub REST API calls are restricted to the official `api.github.com` endpoint by the Rust command.
- Contents API serves on-demand UTF-8 reads. GitHub Git Data API commits staged files using blobs/trees/commits/refs. Source SHA conflict checks and non-force ref updates prevent silent overwrites.
- Workflows are actual `.github/workflows/*.yml` commits, not local simulations. GitHub decides permissions, execution and runner charges.

## Limitations

No OAuth browser login yet; no offline durable drafts, binary/LFS editor, language server, Codespaces, terminal or comprehensive GitHub desktop parity. A valid APK build does not prove device compatibility.

## Signing

Release updates need a permanent signing identity. Default throwaway CI signing is **incompatible with in-place updates** and can remove saved sessions if uninstalling is necessary. See [RELEASE.md](RELEASE.md).
