
# Android releases

## Build

GitHub Actions: `.github/workflows/android.yml`.

1. Run TypeScript/Vite validation.
2. Build ARM64 Android in Rust/Tauri release mode.
3. Generate/restore Android signing keystore, zipalign and sign the release APK.
4. Verify APK signature and archive integrity.
5. Upload an installable `GitHub-Mobile-IDE-v0.2.0-arm64-release.apk` artifact.

## Signing

For persistent signing (necessary for in-place upgrades) set four GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`: base64 encoding of your keystore file.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: signing key alias.
- `ANDROID_KEY_PASSWORD`: key password.

When all four are absent, the workflow creates an ephemeral self-signed key so that an **installable test release APK** can still be produced. This build is not Play Store release ready, and the signing identity changes on each run. Before installing a newer APK signed with a different key, uninstall the older APK (which can remove local app data). Make sure drafts are committed before uninstalling.

Never publish the keystore or passwords to Git, CI logs, APK assets, or public issue comments.

## Security & scope

Only authentic GitHub API calls should modify repositories. App tokens remain in Rust process memory for the current session. A valid release APK is not the same as verification of every functionality on a real phone.
