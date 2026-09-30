fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "vault_pick",
            "vault_restore",
            "vault_scan",
            "vault_read_notes",
            "vault_trash",
            "vault_app_data_read",
            "vault_app_data_write",
        ]),
    ))
    .expect("failed to run tauri-build");
}
