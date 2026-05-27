# WINDOW_SPEC Master Template

This template serves as the master specification for contextual UI layouts, bounding canvas parameters, and window metrics state management. Traditional object-oriented programming (OOP) subclassing is strictly replaced by compositional state contracts.

---

## 1. UI Canvas Layout Grid
- **Bounding Dimensions**: Describe the rigid layout sizing, screen resolutions, and resize limits.
- **Visual Grid Constraints**: Define pixel grids and alignment columns to maintain design integrity across all view configurations.

---

## 2. Window Metrics State Management Contract
To replace traditional subclassing and OOP inheritance (e.g., creating custom subclasses of a window object), every view and window must manage its layout constraints through **local composition-based state configuration**.

- **Locally Restored Dimensions**: The application must automatically persist window position, dimensions, maximized state, and layout offsets upon window resize or drag.
- **Reconciliation Engine**: Upon startup, a lightweight state reconciliation controller reads the persisted properties and compositionally constructs the window frame, avoiding subclassing hierarchies.

---

## 3. Database & Schema Constraints (NON-NEGOTIABLE)

> [!IMPORTANT]
> **Strict Lowercase Plural Snake_Case Convention**
> Every SQLite metadata table created to store window coordinates, user layouts, or canvas dimensions must strictly adhere to the lowercase, plural `snake_case` naming convention. Zero tolerance for singular or PascalCase declarations.

### Example Window Layout Persistence Schema
```sql
-- Correct Implementation Example
CREATE TABLE IF NOT EXISTS window_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    window_label TEXT NOT NULL UNIQUE,   -- E.g., 'main', 'standards_drawer'
    x_coordinate INTEGER NOT NULL,
    y_coordinate INTEGER NOT NULL,
    width_pixels INTEGER NOT NULL,
    height_pixels INTEGER NOT NULL,
    is_maximized INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VIOLATIONS (Zero-Tolerance Policy):
-- CREATE TABLE WindowPosition (...)  -- FAILED (PascalCase / Singular)
-- CREATE TABLE window_position (...)  -- FAILED (Singular)
-- xCoordinate INTEGER                 -- FAILED (camelCase)
```

---

## 4. Context States & Interaction Flow
- Detail how specific user events trigger contextual state redraws in React/Tauri.
- Graph layout bindings and popover containment models.
