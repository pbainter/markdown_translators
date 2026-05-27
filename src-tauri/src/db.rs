use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Requirement {
    pub id: Option<i32>,
    pub spec_type: String,
    pub key_name: String,
    pub title: String,
    pub prompt_question: String,
    pub description: Option<String>,
    pub is_mandatory: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectAnswer {
    pub id: Option<i32>,
    pub project_id: i32,
    pub requirement_key: String,
    pub answer_text: String,
    pub updated_at: Option<String>,
}

// Get SQLite connection, ensuring database and app data directory exist
pub fn get_db_conn(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the app data directory if it doesn't exist
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let db_path = app_data_dir.join("markdown_translator.db");
    Connection::open(db_path).map_err(|e| format!("Failed to open SQLite database: {}", e))
}

// Initialize tables and seed default requirements if empty
pub fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_conn(app_handle)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // 1. global_requirements
    conn.execute(
        "CREATE TABLE IF NOT EXISTS global_requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spec_type TEXT NOT NULL,
            key_name TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            prompt_question TEXT NOT NULL,
            description TEXT,
            is_mandatory INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
        [],
    )
    .map_err(|e| format!("Failed to create global_requirements table: {}", e))?;

    // 2. projects
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
        [],
    )
    .map_err(|e| format!("Failed to create projects table: {}", e))?;

    // 3. project_answers
    conn.execute(
        "CREATE TABLE IF NOT EXISTS project_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            requirement_key TEXT NOT NULL,
            answer_text TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY(requirement_key) REFERENCES global_requirements(key_name) ON DELETE CASCADE,
            UNIQUE(project_id, requirement_key)
        );",
        [],
    )
    .map_err(|e| format!("Failed to create project_answers table: {}", e))?;

    // Seed defaults if table is empty
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM global_requirements",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count requirements: {}", e))?;

    if count == 0 {
        let defaults = vec![
            // APP_SPEC
            Requirement {
                id: None,
                spec_type: "APP_SPEC".to_string(),
                key_name: "local_first_strategy".to_string(),
                title: "Local-First Strategy".to_string(),
                prompt_question: "Describe your local-first architecture strategy (e.g. offline synchronization, write-ahead constraints)?".to_string(),
                description: Some("Defines how the application behaves when disconnected and how local-first integrity is guaranteed.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "APP_SPEC".to_string(),
                key_name: "embedded_db".to_string(),
                title: "Embedded Storage Engine".to_string(),
                prompt_question: "Which Rust-backed local storage engine will you use (e.g., SQLite via rusqlite, Sled, Redb) and why?".to_string(),
                description: Some("Specifies the embedded storage solution that resides on the user's disk.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "APP_SPEC".to_string(),
                key_name: "plural_tables".to_string(),
                title: "Plural Database Table Names".to_string(),
                prompt_question: "What plural database table schemas are planned for this local storage layer (please define schemas using plural table naming, e.g., users, projects)?".to_string(),
                description: Some("Strictly enforces modern industry database conventions where table names are pluralized.".to_string()),
                is_mandatory: true,
            },
            // WINDOW_SPEC
            Requirement {
                id: None,
                spec_type: "WINDOW_SPEC".to_string(),
                key_name: "canvas_grid".to_string(),
                title: "UI Canvas Layout Grid".to_string(),
                prompt_question: "What are the bounding dimensions, grid constraints, and layout parameters of the UI canvas?".to_string(),
                description: Some("Defines the rigorous layout system, window size constraints, and design grid.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "WINDOW_SPEC".to_string(),
                key_name: "oop_alternatives".to_string(),
                title: "OOP Inheritance Alternatives".to_string(),
                prompt_question: "Explain how you will replace traditional OOP inheritance with composition-based states in your UI components?".to_string(),
                description: Some("Enforces contextual state trees and UI compositions over rigid subclassing.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "WINDOW_SPEC".to_string(),
                key_name: "context_states".to_string(),
                title: "Contextual Interaction States".to_string(),
                prompt_question: "What specific user interactions and views will be mapped to the canvas structure?".to_string(),
                description: Some("Maps interface interactions directly to distinct contextual states.".to_string()),
                is_mandatory: true,
            },
            // PROCESS_SPEC
            Requirement {
                id: None,
                spec_type: "PROCESS_SPEC".to_string(),
                key_name: "worker_boundaries".to_string(),
                title: "Background Worker Boundaries".to_string(),
                prompt_question: "What background worker threads are required, and what boundaries isolate them from the main thread?".to_string(),
                description: Some("Ensures heavy processing, file I/O, or networking runs isolated in dedicated threads.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "PROCESS_SPEC".to_string(),
                key_name: "panic_mitigation".to_string(),
                title: "Panic & Failure Recovery Policy".to_string(),
                prompt_question: "What are the failure states for your workers, and how will they recover from crashes/panics?".to_string(),
                description: Some("Details resilience strategies, panic catches, and transaction rollbacks to prevent data corruption.".to_string()),
                is_mandatory: true,
            },
            Requirement {
                id: None,
                spec_type: "PROCESS_SPEC".to_string(),
                key_name: "telemetry_metrics".to_string(),
                title: "Real-time Telemetry Metrics".to_string(),
                prompt_question: "Which real-time metrics (e.g. queue latency, thread usage, event telemetry) will be tracked?".to_string(),
                description: Some("Provides runtime monitoring of background worker health and throughput.".to_string()),
                is_mandatory: true,
            },
        ];

        for req in defaults {
            conn.execute(
                "INSERT INTO global_requirements (spec_type, key_name, title, prompt_question, description, is_mandatory)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    req.spec_type,
                    req.key_name,
                    req.title,
                    req.prompt_question,
                    req.description,
                    if req.is_mandatory { 1 } else { 0 }
                ],
            )
            .map_err(|e| format!("Failed to seed requirement {}: {}", req.key_name, e))?;
        }
    }

    Ok(())
}

// ----------------------------------------------------
// DATABASE CRUD METHODS
// ----------------------------------------------------

pub fn get_requirements_by_type(app_handle: &tauri::AppHandle, spec_type: &str) -> Result<Vec<Requirement>, String> {
    let conn = get_db_conn(app_handle)?;
    let mut stmt = conn
        .prepare("SELECT id, spec_type, key_name, title, prompt_question, description, is_mandatory FROM global_requirements WHERE spec_type = ?1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
        
    let req_iter = stmt
        .query_map([spec_type], |row| {
            let is_mandatory_int: i32 = row.get(6)?;
            Ok(Requirement {
                id: Some(row.get(0)?),
                spec_type: row.get(1)?,
                key_name: row.get(2)?,
                title: row.get(3)?,
                prompt_question: row.get(4)?,
                description: row.get(5)?,
                is_mandatory: is_mandatory_int == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut requirements = Vec::new();
    for req in req_iter {
        requirements.push(req.map_err(|e| e.to_string())?);
    }
    Ok(requirements)
}

pub fn save_requirement(app_handle: &tauri::AppHandle, req: Requirement) -> Result<(), String> {
    let conn = get_db_conn(app_handle)?;
    let is_mandatory_int = if req.is_mandatory { 1 } else { 0 };

    if let Some(id) = req.id {
        conn.execute(
            "UPDATE global_requirements 
             SET spec_type = ?1, key_name = ?2, title = ?3, prompt_question = ?4, description = ?5, is_mandatory = ?6
             WHERE id = ?7",
            params![req.spec_type, req.key_name, req.title, req.prompt_question, req.description, is_mandatory_int, id],
        )
        .map_err(|e| format!("Failed to update requirement: {}", e))?;
    } else {
        conn.execute(
            "INSERT INTO global_requirements (spec_type, key_name, title, prompt_question, description, is_mandatory)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![req.spec_type, req.key_name, req.title, req.prompt_question, req.description, is_mandatory_int],
        )
        .map_err(|e| format!("Failed to insert requirement: {}", e))?;
    }
    Ok(())
}

pub fn delete_requirement(app_handle: &tauri::AppHandle, id: i32) -> Result<(), String> {
    let conn = get_db_conn(app_handle)?;
    conn.execute("DELETE FROM global_requirements WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete requirement: {}", e))?;
    Ok(())
}

pub fn get_projects(app_handle: &tauri::AppHandle) -> Result<Vec<Project>, String> {
    let conn = get_db_conn(app_handle)?;
    let mut stmt = conn
        .prepare("SELECT id, name, description FROM projects ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let proj_iter = stmt
        .query_map([], |row| {
            Ok(Project {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for proj in proj_iter {
        projects.push(proj.map_err(|e| e.to_string())?);
    }
    Ok(projects)
}

pub fn create_project(app_handle: &tauri::AppHandle, name: &str, description: Option<&str>) -> Result<Project, String> {
    let conn = get_db_conn(app_handle)?;
    conn.execute(
        "INSERT INTO projects (name, description) VALUES (?1, ?2)",
        params![name, description],
    )
    .map_err(|e| format!("Failed to create project: {}", e))?;

    let id = conn.last_insert_rowid() as i32;
    Ok(Project {
        id: Some(id),
        name: name.to_string(),
        description: description.map(|s| s.to_string()),
    })
}

pub fn delete_project(app_handle: &tauri::AppHandle, id: i32) -> Result<(), String> {
    let conn = get_db_conn(app_handle)?;
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    Ok(())
}

pub fn get_project_answers(app_handle: &tauri::AppHandle, project_id: i32) -> Result<Vec<ProjectAnswer>, String> {
    let conn = get_db_conn(app_handle)?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, requirement_key, answer_text, updated_at FROM project_answers WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;

    let ans_iter = stmt
        .query_map([project_id], |row| {
            Ok(ProjectAnswer {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                requirement_key: row.get(2)?,
                answer_text: row.get(3)?,
                updated_at: Some(row.get(4)?),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut answers = Vec::new();
    for ans in ans_iter {
        answers.push(ans.map_err(|e| e.to_string())?);
    }
    Ok(answers)
}

pub fn save_project_answer(app_handle: &tauri::AppHandle, project_id: i32, key: &str, text: &str) -> Result<(), String> {
    let conn = get_db_conn(app_handle)?;
    conn.execute(
        "INSERT INTO project_answers (project_id, requirement_key, answer_text, updated_at)
         VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
         ON CONFLICT(project_id, requirement_key) DO UPDATE SET
         answer_text = excluded.answer_text,
         updated_at = CURRENT_TIMESTAMP",
        params![project_id, key, text],
    )
    .map_err(|e| format!("Failed to save answer: {}", e))?;
    Ok(())
}
