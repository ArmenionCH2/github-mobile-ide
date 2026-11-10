# Android release builds and upgrades

The CI workflow `.github/workflows/android.yml` validates TypeScript, compiles Rust/Tauri for Android ARM64 in **release mode**, then zipaligns and signs the APK. Build artifacts are uploaded to the GitHub Actions run.

## Permanent Android signing (required for updates without uninstall)

Set all four GitHub Actions secrets before the release you want to keep upgrading:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded keystore bytes
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: Android key alias
- `ANDROID_KEY_PASSWORD`: key password

If all four are missing, the workflow produces an installable test APK signed using an ephemeral key generated fresh **on each run**. A new key means Android will reject an in-place update from the earlier build; uninstalling the old APK can delete saved accounts and any uncommitted drafts. **No amount of app-side session persistence can override Android's signing requirement.**

Do not commit, disclose, or upload private signing keys into source control or a public artifact. Keep a private backup of the permanent keystore; losing it breaks future upgrades.

## Validation

The workflow must pass TypeScript build, Rust release compilation, APK alignment, signature verification and ZIP integrity before the output is called installable. Device functionality still requires real Android testing.
