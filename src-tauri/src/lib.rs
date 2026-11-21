pub mod formats;
pub mod wayland;
pub mod workspace;

use std::path::PathBuf;
use tauri::Manager;
use workspace::WorkspaceImageEntry;

#[tauri::command]
fn scan_folder(dir_path: String) -> Result<Vec<WorkspaceImageEntry>, String> {
    workspace::scan_folder_dir(&PathBuf::from(dir_path))
}

#[tauri::command]
fn inspect_image(file_path: String) -> Result<WorkspaceImageEntry, String> {
    workspace::inspect_image_path(&PathBuf::from(file_path))
}

#[tauri::command]
fn read_image_bytes(file_path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = workspace::read_image_file_bytes(&PathBuf::from(file_path))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn read_json_file(file_path: String) -> Result<String, String> {
    workspace::read_json_text(&PathBuf::from(file_path))
}

#[tauri::command]
fn write_json_file(file_path: String, content: String) -> Result<(), String> {
    workspace::write_json_atomic(&PathBuf::from(file_path), &content)
}

#[tauri::command]
fn load_custom_categories(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Erro ao resolver diretório de configuração: {e}"))?;
    let cat_path = config_dir.join("anato-categories.json");
    if !cat_path.is_file() {
        return Ok(None);
    }
    workspace::read_json_text(&cat_path).map(Some)
}

#[tauri::command]
fn save_custom_categories(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Erro ao resolver diretório de configuração: {e}"))?;
    let cat_path = config_dir.join("anato-categories.json");
    workspace::write_json_atomic(&cat_path, &content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            inspect_image,
            read_image_bytes,
            read_json_file,
            write_json_file,
            load_custom_categories,
            save_custom_categories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
