mod db;
mod fs;

use db::{Project, ProjectAnswer, Requirement};
use fs::RawThoughtFile;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// --------------------- OBJECTIVE 1 COMMANDS (Global Standards CRUD) ---------------------

#[tauri::command]
fn get_requirements(app_handle: tauri::AppHandle, spec_type: String) -> Result<Vec<Requirement>, String> {
    db::get_requirements_by_type(&app_handle, &spec_type)
}

#[tauri::command]
fn save_requirement(app_handle: tauri::AppHandle, req: Requirement) -> Result<(), String> {
    db::save_requirement(&app_handle, req)
}

#[tauri::command]
fn delete_requirement(app_handle: tauri::AppHandle, id: i32) -> Result<(), String> {
    db::delete_requirement(&app_handle, id)
}

// --------------------- OBJECTIVE 2 COMMANDS (Projects & Answering Wizard) ---------------------

#[tauri::command]
fn get_projects(app_handle: tauri::AppHandle) -> Result<Vec<Project>, String> {
    db::get_projects(&app_handle)
}

#[tauri::command]
fn create_project(app_handle: tauri::AppHandle, name: String, description: Option<String>) -> Result<Project, String> {
    db::create_project(&app_handle, &name, description.as_deref())
}

#[tauri::command]
fn delete_project(app_handle: tauri::AppHandle, id: i32) -> Result<(), String> {
    db::delete_project(&app_handle, id)
}

#[tauri::command]
fn get_project_answers(app_handle: tauri::AppHandle, project_id: i32) -> Result<Vec<ProjectAnswer>, String> {
    db::get_project_answers(&app_handle, project_id)
}

#[tauri::command]
fn save_project_answer(app_handle: tauri::AppHandle, project_id: i32, key: String, text: String) -> Result<(), String> {
    db::save_project_answer(&app_handle, project_id, &key, &text)
}

// --------------------- OBJECTIVE 3 COMMANDS (Thoughts Filesystem & Spec Exporter) ---------------------

#[tauri::command]
fn save_raw_thought(content: String, description: String) -> Result<String, String> {
    fs::save_thought(&content, &description)
}

#[tauri::command]
fn list_raw_thoughts() -> Result<Vec<RawThoughtFile>, String> {
    fs::list_thoughts()
}

#[tauri::command]
fn read_raw_thought(filename: String) -> Result<String, String> {
    fs::read_thought(&filename)
}

#[tauri::command]
fn export_specification(filename: String, content: String) -> Result<String, String> {
    fs::export_spec(&filename, &content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init_db(app.handle()).map_err(|e| {
                eprintln!("Database initialization failed: {}", e);
                // Box error nicely for Tauri bootstrap
                Box::<dyn std::error::Error + Send + Sync>::from(e)
            })?;
            
            // Ensure raw_thoughts directory exists on setup
            let _ = fs::get_raw_thoughts_dir();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_requirements,
            save_requirement,
            delete_requirement,
            get_projects,
            create_project,
            delete_project,
            get_project_answers,
            save_project_answer,
            save_raw_thought,
            list_raw_thoughts,
            read_raw_thought,
            export_specification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
