mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(vault::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            vault::vault_pick,
            vault::vault_restore,
            vault::vault_scan,
            vault::vault_read_notes,
            vault::vault_trash,
            vault::vault_app_data_read,
            vault::vault_app_data_write
        ])
        .run(tauri::generate_context!())
        .expect("error while running Dev Notes");
}
