//! Vault commands. They bypass the `fs` plugin scope, so every path they
//! receive is validated to stay inside the open vault (research R3, R4, R6).

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

const CONFIG_FILE: &str = "vault.json";
const APP_DATA_DIR: &str = ".devnotes";

#[derive(Default)]
pub struct VaultState {
    pub root: Mutex<Option<PathBuf>>,
    pub trash_lock: Mutex<()>,
}

/// Serialized as the same strings as `VaultErrorCode` in `shared/vault`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VaultCmdError {
    NotFound,
    InvalidName,
    PermissionDenied,
    TrashUnavailable,
    VaultUnavailable,
    Io,
}

impl VaultCmdError {
    pub fn code(self) -> &'static str {
        match self {
            Self::NotFound => "not-found",
            Self::InvalidName => "invalid-name",
            Self::PermissionDenied => "permission-denied",
            Self::TrashUnavailable => "trash-unavailable",
            Self::VaultUnavailable => "vault-unavailable",
            Self::Io => "io",
        }
    }
}

impl Serialize for VaultCmdError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.code())
    }
}

impl From<io::Error> for VaultCmdError {
    fn from(error: io::Error) -> Self {
        match error.kind() {
            io::ErrorKind::NotFound => Self::NotFound,
            io::ErrorKind::PermissionDenied => Self::PermissionDenied,
            _ => Self::Io,
        }
    }
}

type CmdResult<T> = Result<T, VaultCmdError>;

/// Resolves a vault-relative path (`a/b.md`) against `root`. Rejects `..`,
/// `.`, empty segments, absolute paths, `\` and `:`, and any result whose
/// canonical form (symlinks resolved) leaves the canonical root. For a target
/// that does not exist yet, the closest existing ancestor is canonicalized.
/// Returns the plain joined path, which the OS shell APIs accept.
pub fn resolve_in_vault(root: &Path, rel: &str) -> CmdResult<PathBuf> {
    if rel.is_empty() || rel.contains('\\') || rel.contains(':') || Path::new(rel).is_absolute() {
        return Err(VaultCmdError::InvalidName);
    }
    let mut joined = root.to_path_buf();
    for segment in rel.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(VaultCmdError::InvalidName);
        }
        joined.push(segment);
    }
    let canonical_root = fs::canonicalize(root).map_err(|_| VaultCmdError::VaultUnavailable)?;
    let mut existing = joined.as_path();
    let mut missing = Vec::new();
    while fs::symlink_metadata(existing).is_err() {
        missing.push(existing.file_name().ok_or(VaultCmdError::InvalidName)?.to_owned());
        existing = existing.parent().ok_or(VaultCmdError::InvalidName)?;
    }
    let mut canonical = fs::canonicalize(existing).map_err(|_| VaultCmdError::InvalidName)?;
    for part in missing.iter().rev() {
        canonical.push(part);
    }
    if canonical == canonical_root || !canonical.starts_with(&canonical_root) {
        return Err(VaultCmdError::InvalidName);
    }
    Ok(joined)
}

fn current_root(state: &VaultState) -> CmdResult<PathBuf> {
    let root = state.root.lock().map_err(|_| VaultCmdError::Io)?.clone();
    match root {
        Some(root) if root.is_dir() => Ok(root),
        _ => Err(VaultCmdError::VaultUnavailable),
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct StoredVault {
    root: String,
    last_opened_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoredVault {
    root: String,
    last_opened_at: String,
    exists: bool,
}

fn config_path<R: Runtime>(app: &AppHandle<R>) -> CmdResult<PathBuf> {
    let dir = app.path().app_config_dir().map_err(|_| VaultCmdError::Io)?;
    Ok(dir.join(CONFIG_FILE))
}

fn open_root<R: Runtime>(app: &AppHandle<R>, state: &VaultState, root: &Path) -> CmdResult<()> {
    app.fs_scope()
        .allow_directory(root, true)
        .map_err(|_| VaultCmdError::PermissionDenied)?;
    *state.root.lock().map_err(|_| VaultCmdError::Io)? = Some(root.to_path_buf());
    Ok(())
}

#[tauri::command]
pub async fn vault_pick<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VaultState>,
) -> CmdResult<Option<String>> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let root = picked.into_path().map_err(|_| VaultCmdError::InvalidName)?;
    open_root(&app, &state, &root)?;
    let stored = StoredVault {
        root: root.to_string_lossy().into_owned(),
        last_opened_at: iso_now(),
    };
    let path = config_path(&app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    fs::write(&path, serde_json::to_string_pretty(&stored).map_err(|_| VaultCmdError::Io)?)?;
    Ok(Some(stored.root))
}

#[tauri::command]
pub fn vault_restore<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VaultState>,
) -> CmdResult<Option<RestoredVault>> {
    let path = config_path(&app)?;
    let Ok(text) = fs::read_to_string(&path) else {
        return Ok(None);
    };
    let Ok(stored) = serde_json::from_str::<StoredVault>(&text) else {
        return Ok(None);
    };
    let root = PathBuf::from(&stored.root);
    let exists = root.is_dir();
    if exists {
        open_root(&app, &state, &root)?;
    }
    Ok(Some(RestoredVault {
        root: stored.root,
        last_opened_at: stored.last_opened_at,
        exists,
    }))
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanEntry {
    pub path: String,
    pub kind: &'static str,
    pub name: String,
    /// Milliseconds since 1970; 0 for folders.
    pub modified_at: u64,
}

fn modified_ms(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn kind_of(file_name: &str) -> &'static str {
    let lower = file_name.to_lowercase();
    if lower.ends_with(".md") {
        "note"
    } else if lower.ends_with(".canvas") {
        "canvas"
    } else {
        "other"
    }
}

/// Recursive listing. Skips names starting with "." and never follows nor
/// lists symbolic links (or Windows junctions), so it cannot loop or leave
/// the vault.
pub fn scan(root: &Path) -> CmdResult<Vec<ScanEntry>> {
    if !root.is_dir() {
        return Err(VaultCmdError::VaultUnavailable);
    }
    let mut entries = Vec::new();
    let mut pending = vec![(root.to_path_buf(), String::new())];
    while let Some((dir, prefix)) = pending.pop() {
        for item in fs::read_dir(&dir)? {
            let item = item?;
            let file_name = item.file_name().to_string_lossy().into_owned();
            if file_name.starts_with('.') {
                continue;
            }
            let file_type = item.file_type()?;
            if file_type.is_symlink() {
                continue;
            }
            let path = if prefix.is_empty() {
                file_name.clone()
            } else {
                format!("{prefix}/{file_name}")
            };
            if file_type.is_dir() {
                pending.push((item.path(), path.clone()));
                entries.push(ScanEntry { path, kind: "folder", name: file_name, modified_at: 0 });
            } else if file_type.is_file() {
                let kind = kind_of(&file_name);
                let name = if kind == "note" {
                    file_name[..file_name.len() - 3].to_string()
                } else {
                    file_name
                };
                let modified_at = modified_ms(&item.metadata()?);
                entries.push(ScanEntry { path, kind, name, modified_at });
            }
        }
    }
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
}

#[tauri::command]
pub fn vault_scan(state: State<'_, VaultState>) -> CmdResult<Vec<ScanEntry>> {
    scan(&current_root(&state)?)
}

#[derive(Debug, Serialize)]
pub struct NoteContent {
    pub path: String,
    pub content: String,
}

/// Reads in the requested order. A file that vanished between the listing and
/// the read is left out, as in the memory adapter.
pub fn read_notes(root: &Path, paths: Vec<String>) -> CmdResult<Vec<NoteContent>> {
    let mut notes = Vec::with_capacity(paths.len());
    for rel in paths {
        let full = resolve_in_vault(root, &rel)?;
        match fs::read(&full) {
            Ok(bytes) => notes.push(NoteContent {
                path: rel,
                content: String::from_utf8_lossy(&bytes).into_owned(),
            }),
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
    }
    Ok(notes)
}

#[tauri::command]
pub async fn vault_read_notes(
    state: State<'_, VaultState>,
    paths: Vec<String>,
) -> CmdResult<Vec<NoteContent>> {
    read_notes(&current_root(&state)?, paths)
}

/// `^[a-z0-9-]+\.json$`, checked by hand to avoid a regex crate.
fn is_app_data_name(name: &str) -> bool {
    name.strip_suffix(".json").is_some_and(|stem| {
        !stem.is_empty() && stem.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
    })
}

fn is_link(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_symlink())
}

/// `<root>/.devnotes/<name>` (ADR-009). Never follows a symbolic link, so a
/// cloned vault whose `.devnotes` points elsewhere gets nothing written
/// outside it. `None` when the folder does not exist and `create` is false.
fn app_data_file(root: &Path, name: &str, create: bool) -> CmdResult<Option<PathBuf>> {
    if !is_app_data_name(name) {
        return Err(VaultCmdError::InvalidName);
    }
    let dir = root.join(APP_DATA_DIR);
    if is_link(&dir) {
        return Err(VaultCmdError::InvalidName);
    }
    if !dir.exists() {
        if !create {
            return Ok(None);
        }
        fs::create_dir(&dir)?;
    }
    let canonical_root = fs::canonicalize(root).map_err(|_| VaultCmdError::VaultUnavailable)?;
    let canonical_dir = fs::canonicalize(&dir)?;
    if !canonical_dir.is_dir() || canonical_dir.parent() != Some(canonical_root.as_path()) {
        return Err(VaultCmdError::InvalidName);
    }
    let file = dir.join(name);
    if is_link(&file) {
        return Err(VaultCmdError::InvalidName);
    }
    Ok(Some(file))
}

pub fn read_app_data(root: &Path, name: &str) -> CmdResult<Option<String>> {
    let Some(file) = app_data_file(root, name, false)? else {
        return Ok(None);
    };
    match fs::read_to_string(&file) {
        Ok(text) => Ok(Some(text)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub fn write_app_data(root: &Path, name: &str, content: &str) -> CmdResult<()> {
    let file = app_data_file(root, name, true)?.ok_or(VaultCmdError::Io)?;
    fs::write(file, content)?;
    Ok(())
}

#[tauri::command]
pub fn vault_app_data_read(state: State<'_, VaultState>, name: String) -> CmdResult<Option<String>> {
    read_app_data(&current_root(&state)?, &name)
}

#[tauri::command]
pub fn vault_app_data_write(state: State<'_, VaultState>, name: String, content: String) -> CmdResult<()> {
    write_app_data(&current_root(&state)?, &name, &content)
}

fn trash_context() -> trash::TrashContext {
    #[allow(unused_mut)]
    let mut context = trash::TrashContext::default();
    #[cfg(target_os = "macos")]
    {
        use trash::macos::{DeleteMethod, TrashContextExtMacos};
        context.set_delete_method(DeleteMethod::NsFileManager);
    }
    context
}

/// Sends to the OS trash. Any trash error becomes "trash-unavailable": there
/// is no retry and never a permanent delete (FR-024).
pub fn move_to_trash(root: &Path, rel: &str, lock: &Mutex<()>) -> CmdResult<()> {
    let full = resolve_in_vault(root, rel)?;
    if fs::symlink_metadata(&full).is_err() {
        return Err(VaultCmdError::NotFound);
    }
    let _guard = lock.lock().map_err(|_| VaultCmdError::TrashUnavailable)?;
    trash_context()
        .delete(&full)
        .map_err(|_| VaultCmdError::TrashUnavailable)
}

#[tauri::command]
pub async fn vault_trash(state: State<'_, VaultState>, path: String) -> CmdResult<()> {
    move_to_trash(&current_root(&state)?, &path, &state.trash_lock)
}

fn iso_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    iso_from_unix(secs)
}

/// UTC timestamp without a date crate (Howard Hinnant's civil-from-days).
fn iso_from_unix(secs: i64) -> String {
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z",
        rem / 3_600,
        rem % 3_600 / 60,
        rem % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vault() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("backend")).unwrap();
        fs::write(dir.path().join("backend/api.md"), "# api").unwrap();
        fs::write(dir.path().join("infra.md"), "[[deploy]]").unwrap();
        fs::write(dir.path().join("mapa.canvas"), "{}").unwrap();
        fs::write(dir.path().join("logo.png"), [0u8, 1]).unwrap();
        fs::create_dir(dir.path().join(".devnotes")).unwrap();
        fs::write(dir.path().join(".devnotes/config.json"), "{}").unwrap();
        fs::write(dir.path().join(".oculta.md"), "x").unwrap();
        dir
    }

    /// Symlinks need a privilege on Windows; a junction does not.
    fn link_dir(target: &Path, link: &Path) -> bool {
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(target, link).is_ok()
        }
        #[cfg(windows)]
        {
            std::os::windows::fs::symlink_dir(target, link).is_ok()
                || std::process::Command::new("cmd")
                    .args(["/C", "mklink", "/J"])
                    .arg(link)
                    .arg(target)
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false)
        }
    }

    #[test]
    fn resolve_accepts_paths_inside_the_vault() {
        let dir = vault();
        let path = resolve_in_vault(dir.path(), "backend/api.md").unwrap();
        assert_eq!(path, dir.path().join("backend").join("api.md"));
        assert!(resolve_in_vault(dir.path(), "novo/pasta/nota.md").is_ok());
    }

    #[test]
    fn resolve_rejects_escapes_and_malformed_paths() {
        let dir = vault();
        for bad in ["../fora.md", "backend/../../fora.md", "a//b.md", "./x.md", "", "c:/x.md", "a\\b.md"] {
            assert_eq!(resolve_in_vault(dir.path(), bad), Err(VaultCmdError::InvalidName), "{bad}");
        }
        let absolute = dir.path().join("infra.md");
        assert_eq!(
            resolve_in_vault(dir.path(), &absolute.to_string_lossy()),
            Err(VaultCmdError::InvalidName)
        );
    }

    #[test]
    fn resolve_rejects_a_link_that_leaves_the_vault() {
        let dir = vault();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("segredo.md"), "x").unwrap();
        if !link_dir(outside.path(), &dir.path().join("atalho")) {
            eprintln!("skipped: this system cannot create directory links");
            return;
        }
        assert_eq!(
            resolve_in_vault(dir.path(), "atalho/segredo.md"),
            Err(VaultCmdError::InvalidName)
        );
    }

    #[test]
    fn scan_lists_kinds_and_skips_hidden_entries() {
        let dir = vault();
        let entries = scan(dir.path()).unwrap();
        let summary: Vec<_> = entries
            .iter()
            .map(|e| (e.path.as_str(), e.kind, e.name.as_str()))
            .collect();
        assert!(entries.iter().all(|e| (e.kind == "folder") == (e.modified_at == 0)), "{entries:?}");
        assert_eq!(
            summary,
            vec![
                ("backend", "folder", "backend"),
                ("backend/api.md", "note", "api"),
                ("infra.md", "note", "infra"),
                ("logo.png", "other", "logo.png"),
                ("mapa.canvas", "canvas", "mapa.canvas"),
            ]
        );
    }

    #[test]
    fn scan_ignores_links_out_of_the_vault_and_link_loops() {
        let dir = vault();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("fora.md"), "x").unwrap();
        let linked_out = link_dir(outside.path(), &dir.path().join("para-fora"));
        let linked_loop = link_dir(dir.path(), &dir.path().join("backend").join("loop"));
        if !linked_out || !linked_loop {
            eprintln!("skipped: this system cannot create directory links");
            return;
        }
        let paths: Vec<_> = scan(dir.path()).unwrap().into_iter().map(|e| e.path).collect();
        assert!(!paths.iter().any(|p| p.contains("para-fora") || p.contains("loop")), "{paths:?}");
    }

    #[test]
    fn scan_of_a_missing_root_is_vault_unavailable() {
        let dir = vault();
        let gone = dir.path().join("nao-existe");
        assert_eq!(scan(&gone).unwrap_err(), VaultCmdError::VaultUnavailable);
    }

    #[test]
    fn read_notes_keeps_order_and_skips_vanished_files() {
        let dir = vault();
        let notes = read_notes(
            dir.path(),
            vec!["infra.md".into(), "sumiu.md".into(), "backend/api.md".into()],
        )
        .unwrap();
        let got: Vec<_> = notes.iter().map(|n| (n.path.as_str(), n.content.as_str())).collect();
        assert_eq!(got, vec![("infra.md", "[[deploy]]"), ("backend/api.md", "# api")]);
        assert_eq!(
            read_notes(dir.path(), vec!["../x.md".into()]).unwrap_err(),
            VaultCmdError::InvalidName
        );
    }

    #[test]
    fn trash_rejects_missing_and_outside_paths_without_touching_anything() {
        let dir = vault();
        let lock = Mutex::new(());
        assert_eq!(move_to_trash(dir.path(), "nao-existe.md", &lock), Err(VaultCmdError::NotFound));
        assert_eq!(move_to_trash(dir.path(), "../infra.md", &lock), Err(VaultCmdError::InvalidName));
        assert!(dir.path().join("infra.md").exists());
    }

    #[test]
    fn scan_serializes_modified_at_in_camel_case() {
        let dir = vault();
        let json = serde_json::to_string(&scan(dir.path()).unwrap()[0]).unwrap();
        assert!(json.contains("\"modifiedAt\":0"), "{json}");
    }

    #[test]
    fn app_data_rejects_names_outside_the_pattern() {
        let dir = vault();
        for bad in ["../x.json", "A.json", "x.txt", "a/b.json", ".json", "", "a\\b.json"] {
            assert_eq!(read_app_data(dir.path(), bad), Err(VaultCmdError::InvalidName), "{bad}");
            assert_eq!(write_app_data(dir.path(), bad, "{}"), Err(VaultCmdError::InvalidName), "{bad}");
        }
    }

    #[test]
    fn app_data_reads_none_when_missing_and_round_trips() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read_app_data(dir.path(), "deleted-notes.json"), Ok(None));
        write_app_data(dir.path(), "deleted-notes.json", "{\"version\":1}").unwrap();
        assert_eq!(
            read_app_data(dir.path(), "deleted-notes.json"),
            Ok(Some("{\"version\":1}".to_string()))
        );
        assert!(dir.path().join(".devnotes/deleted-notes.json").is_file());
        assert!(scan(dir.path()).unwrap().is_empty());
    }

    #[test]
    fn app_data_never_follows_a_devnotes_link_out_of_the_vault() {
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        if !link_dir(outside.path(), &dir.path().join(APP_DATA_DIR)) {
            eprintln!("skipped: this system cannot create directory links");
            return;
        }
        assert_eq!(
            write_app_data(dir.path(), "deleted-notes.json", "{}"),
            Err(VaultCmdError::InvalidName)
        );
        assert_eq!(read_app_data(dir.path(), "deleted-notes.json"), Err(VaultCmdError::InvalidName));
        assert!(!outside.path().join("deleted-notes.json").exists());
    }

    #[test]
    fn errors_serialize_as_vault_error_codes() {
        assert_eq!(serde_json::to_string(&VaultCmdError::TrashUnavailable).unwrap(), "\"trash-unavailable\"");
        assert_eq!(serde_json::to_string(&VaultCmdError::InvalidName).unwrap(), "\"invalid-name\"");
    }

    #[test]
    fn iso_timestamp_is_utc() {
        assert_eq!(iso_from_unix(0), "1970-01-01T00:00:00Z");
        assert_eq!(iso_from_unix(1_790_000_000), "2026-09-21T14:13:20Z");
    }
}
