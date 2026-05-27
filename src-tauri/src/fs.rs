use chrono::Local;
use std::fs;
use std::path::PathBuf;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct RawThoughtFile {
    pub filename: String,
    pub date_str: String,
    pub description: String,
    pub path: String,
}

// Robust function to find the project root directory
pub fn get_workspace_root() -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        // If launched inside src-tauri, parent is the root
        if cwd.ends_with("src-tauri") {
            if let Some(parent) = cwd.parent() {
                return parent.to_path_buf();
            }
        }
        return cwd;
    }
    PathBuf::from(r"d:\Dev\Antigravity\MarkdownTranslator")
}

// Get the raw_thoughts path and ensure it exists
pub fn get_raw_thoughts_dir() -> Result<PathBuf, String> {
    let root = get_workspace_root();
    let thoughts_dir = root.join("raw_thoughts");
    if !thoughts_dir.exists() {
        fs::create_dir_all(&thoughts_dir)
            .map_err(|e| format!("Failed to create raw_thoughts directory: {}", e))?;
    }
    Ok(thoughts_dir)
}

// Convert arbitrary string to lowercase snake_case
pub fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let mut last_was_underscore = false;

    for c in s.chars() {
        if c.is_alphanumeric() {
            result.push_str(&c.to_lowercase().to_string());
            last_was_underscore = false;
        } else if c.is_whitespace() || c == '_' || c == '-' {
            if !last_was_underscore && !result.is_empty() {
                result.push('_');
                last_was_underscore = true;
            }
        }
    }

    // Clean up trailing underscores
    while result.ends_with('_') {
        result.pop();
    }
    
    if result.is_empty() {
        "thought".to_string()
    } else {
        result
    }
}

// Save a raw thought file
pub fn save_thought(content: &str, description: &str) -> Result<String, String> {
    let dir = get_raw_thoughts_dir()?;
    let date_prefix = Local::now().format("%Y%m%d").to_string();
    let snake_desc = to_snake_case(description);
    
    let filename = format!("{}_{}.txt", date_prefix, snake_desc);
    let filepath = dir.join(&filename);
    
    fs::write(&filepath, content)
        .map_err(|e| format!("Failed to write raw thought file: {}", e))?;
        
    Ok(filename)
}

// List all thoughts chronologically (newest first)
pub fn list_thoughts() -> Result<Vec<RawThoughtFile>, String> {
    let dir = get_raw_thoughts_dir()?;
    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read raw_thoughts directory: {}", e))?;
        
    let mut thoughts = Vec::new();
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "txt") {
                if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
                    // Try parsing "YYYYMMDD_description.txt"
                    let parts: Vec<&str> = filename.splitn(2, '_').collect();
                    let (date_str, description) = if parts.len() == 2 {
                        let date = parts[0];
                        // Strip the ".txt" from description
                        let desc = parts[1].strip_suffix(".txt").unwrap_or(parts[1]);
                        // Replace underscores with spaces for prettier title in UI
                        let pretty_desc = desc.replace('_', " ");
                        (date.to_string(), pretty_desc)
                    } else {
                        ("Unknown".to_string(), filename.to_string())
                    };
                    
                    thoughts.push(RawThoughtFile {
                        filename: filename.to_string(),
                        date_str,
                        description,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    
    // Sort by filename descending (effectively YYYYMMDD chronological newest first)
    thoughts.sort_by(|a, b| b.filename.cmp(&a.filename));
    
    Ok(thoughts)
}

// Read content of a specific thought file
pub fn read_thought(filename: &str) -> Result<String, String> {
    let dir = get_raw_thoughts_dir()?;
    
    // Ensure filename doesn't contain path traversal sequences
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Invalid filename provided".to_string());
    }
    
    let filepath = dir.join(filename);
    if !filepath.exists() {
        return Err(format!("File {} does not exist", filename));
    }
    
    fs::read_to_string(filepath)
        .map_err(|e| format!("Failed to read raw thought content: {}", e))
}

// Export final specification file to workspace root
pub fn export_spec(filename: &str, content: &str) -> Result<String, String> {
    let root = get_workspace_root();
    
    // Enforce strictly one of the three specification names
    if filename != "APP_SPEC.md" && filename != "WINDOW_SPEC.md" && filename != "PROCESS_SPEC.md" {
        return Err("Only APP_SPEC.md, WINDOW_SPEC.md, and PROCESS_SPEC.md can be exported".to_string());
    }
    
    let filepath = root.join(filename);
    fs::write(&filepath, content)
        .map_err(|e| format!("Failed to export spec file: {}", e))?;
        
    Ok(filepath.to_string_lossy().to_string())
}
