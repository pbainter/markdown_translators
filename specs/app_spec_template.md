# APP_SPEC Master Template

This template serves as the master specification for application architectural rules, local storage strategies, and database schemas. Every application specification drafted using this tool must conform strictly to these guidelines.

---

## 1. Local-First Architectural Principles
- **Offline Synchronization**: The application must run locally on the client's device, maintaining a fully functioning state even when disconnected.
- **Write-Ahead Constraints**: Data mutations must be executed locally first, with asynchronous delta updates queued for remote sync if applicable.
- **Persistence Guarantees**: Transactions must follow rigorous ACID compliance locally to prevent data corruption during power events.

---

## 2. Database & Schema Constraints (NON-NEGOTIABLE)

> [!IMPORTANT]
> **Strict Lowercase Plural Snake_Case Convention**
> Every database table, column, index, and view must strictly use lowercase, plural `snake_case` names. There is a **zero-tolerance policy** for singular naming conventions (e.g., `user`, `project`) or OOP-centric PascalCase naming conventions (e.g., `UserAccounts`, `ProjectSettings`). 

### Schema Directives
- **Table Names**: Must be pluralized nouns using lowercase letters and underscores (e.g., `users`, `project_answers`, `global_requirements`).
- **Column Names**: Must be lowercase snake_case (e.g., `requirement_key`, `answer_text`, `updated_at`).
- **Primary / Foreign Keys**: Primary keys must be named `id`. Foreign keys must strictly append `_id` to the singular representation of the referenced table (e.g., `project_id` referencing the `projects` table).
- **Index Naming**: Index identifiers must follow the pattern `idx_[plural_table_name]_[column_name]` (e.g., `idx_project_answers_requirement_key`).

### Example SQLite Validation Schema
```sql
-- Correct Implementation Example
CREATE TABLE IF NOT EXISTS project_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    requirement_key TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(requirement_key) REFERENCES global_requirements(key_name) ON DELETE CASCADE,
    UNIQUE(project_id, requirement_key)
);

-- VIOLATIONS (Zero-Tolerance Policy):
-- CREATE TABLE ProjectAnswer (...)  -- FAILED (PascalCase / Singular)
-- CREATE TABLE project_answer (...)  -- FAILED (Singular)
-- colName TEXT                       -- FAILED (camelCase)
```

---

## 3. Core Software Component Mapping
- Describe how application business rules map to local Rust modules.
- Define memory limits and database transaction boundaries for critical subsystems.
