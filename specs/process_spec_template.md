# PROCESS_SPEC Master Template

This template serves as the master specification for background worker boundaries, crash mitigation policies, and real-time telemetry indicators.

---

## 1. Background Worker Thread Boundaries
- **Strict Isolation**: All long-running tasks, heavy disk I/O, database writes, and synchronous file processing must execute outside the main UI event thread.
- **Inter-Process Communication (IPC)**: Thread message dispatching must rely strictly on robust channels (e.g., crossbeam channels or `std::sync::mpsc` in Rust) with lock-free data models to eliminate UI freezes.
- **Rate-Limiting**: Background processes must implement throttles to prevent CPU exhaustion.

---

## 2. Progress Event Triggers
To guarantee real-time UI responsiveness, background threads must communicate runtime execution benchmarks back to the main UI shell using **Progress Event Triggers**:

- **Telemetry Emitters**: Workers must broadcast structured progress events containing a completed step index, description key, elapsed runtime, and failure flags.
- **Event Types**:
  - `progress_started`: Fired when a worker thread boots.
  - `progress_delta`: Broadcasted at fixed completion intervals (e.g., every 10% or after each row processed) to update UI loaders.
  - `progress_completed`: Emitter indicating the transaction successfully closed.
  - `progress_aborted`: Emitted upon catches of local panics or fatal transactional crashes.

---

## 3. Database & Schema Constraints (NON-NEGOTIABLE)

> [!IMPORTANT]
> **Strict Lowercase Plural Snake_Case Convention**
> All operational tables storing metrics, log traces, event queues, or heartbeats must strictly enforce the lowercase, plural `snake_case` naming rules. Singular tables or PascalCase names will not be accepted by the translator validation parser.

### Example Telemetry Metrics Schema
```sql
-- Correct Implementation Example
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_name TEXT NOT NULL,          -- E.g., 'file_logger', 'db_indexer'
    event_severity TEXT NOT NULL,       -- E.g., 'info', 'warn', 'panic'
    latency_microseconds INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VIOLATIONS (Zero-Tolerance Policy):
-- CREATE TABLE TelemetryEvent (...)  -- FAILED (PascalCase / Singular)
-- CREATE TABLE telemetry_event (...)  -- FAILED (Singular)
-- recordTime TEXT                     -- FAILED (camelCase)
```

---

## 4. Telemetry Metrics & Runtime Monitoring
- Define which operational values will be sent to the telemetry queue (e.g., loop latency, read throughput).
- Detail the telemetry reporting frequency and aggregation methods.
