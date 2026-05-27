import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  FileText, 
  BookOpen, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Save, 
  ArrowRight, 
  Eye, 
  FileCode, 
  FolderOpen,
  FolderPlus
} from "lucide-react";

// Types matching Rust structs
interface Requirement {
  id?: number;
  spec_type: string;
  key_name: string;
  title: string;
  prompt_question: string;
  description: string | null;
  is_mandatory: boolean;
}

interface Project {
  id?: number;
  name: string;
  description: string | null;
}

interface ProjectAnswer {
  id?: number;
  project_id: number;
  requirement_key: string;
  answer_text: string;
  updated_at?: string;
}

interface RawThoughtFile {
  filename: string;
  date_str: string;
  description: string;
  path: string;
}

// -----------------------------------------------------------------------------------
// HIGH-FIDELITY BROWSER FALLBACK MOCK SYSTEM
// -----------------------------------------------------------------------------------
const isTauri = typeof window !== "undefined" && ((window as any).__TAURI_IPC__ !== undefined || (window as any).__TAURI__ !== undefined);

async function safeInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri) {
    return await invoke<T>(cmd, args);
  }

  // Initialize mock database state in browser local storage
  if (!localStorage.getItem("mt_seeded")) {
    const defaultRequirements: Requirement[] = [
      // APP_SPEC
      {
        id: 1,
        spec_type: "APP_SPEC",
        key_name: "local_first_strategy",
        title: "Local-First Strategy",
        prompt_question: "Describe your local-first architecture strategy (e.g. offline synchronization, write-ahead constraints)?",
        description: "Defines how the application behaves when disconnected and how local-first integrity is guaranteed.",
        is_mandatory: true
      },
      {
        id: 2,
        spec_type: "APP_SPEC",
        key_name: "embedded_db",
        title: "Embedded Storage Engine",
        prompt_question: "Which Rust-backed local storage engine will you use (e.g., SQLite via rusqlite, Sled, Redb) and why?",
        description: "Specifies the embedded storage solution that resides on the user's disk.",
        is_mandatory: true
      },
      {
        id: 3,
        spec_type: "APP_SPEC",
        key_name: "plural_tables",
        title: "Plural Database Table Names",
        prompt_question: "What plural database table schemas are planned for this local storage layer (please define schemas using plural table naming, e.g., users, projects)?",
        description: "Strictly enforces modern industry database conventions where table names are pluralized.",
        is_mandatory: true
      },
      // WINDOW_SPEC
      {
        id: 4,
        spec_type: "WINDOW_SPEC",
        key_name: "canvas_grid",
        title: "UI Canvas Layout Grid",
        prompt_question: "What are the bounding dimensions, grid constraints, and layout parameters of the UI canvas?",
        description: "Defines the rigorous layout system, window size constraints, and design grid.",
        is_mandatory: true
      },
      {
        id: 5,
        spec_type: "WINDOW_SPEC",
        key_name: "oop_alternatives",
        title: "OOP Inheritance Alternatives",
        prompt_question: "Explain how you will replace traditional OOP inheritance with composition-based states in your UI components?",
        description: "Enforces contextual state trees and UI compositions over rigid subclassing.",
        is_mandatory: true
      },
      {
        id: 6,
        spec_type: "WINDOW_SPEC",
        key_name: "context_states",
        title: "Contextual Interaction States",
        prompt_question: "What specific user interactions and views will be mapped to the canvas structure?",
        description: "Maps interface interactions directly to distinct contextual states.",
        is_mandatory: true
      },
      // PROCESS_SPEC
      {
        id: 7,
        spec_type: "PROCESS_SPEC",
        key_name: "worker_boundaries",
        title: "Background Worker Boundaries",
        prompt_question: "What background worker threads are required, and what boundaries isolate them from the main thread?",
        description: "Ensures heavy processing, file I/O, or networking runs isolated in dedicated threads.",
        is_mandatory: true
      },
      {
        id: 8,
        spec_type: "PROCESS_SPEC",
        key_name: "panic_mitigation",
        title: "Panic & Failure Recovery Policy",
        prompt_question: "What are the failure states for your workers, and how will they recover from crashes/panics?",
        description: "Details resilience strategies, panic catches, and transaction rollbacks to prevent data corruption.",
        is_mandatory: true
      },
      {
        id: 9,
        spec_type: "PROCESS_SPEC",
        key_name: "telemetry_metrics",
        title: "Real-time Telemetry Metrics",
        prompt_question: "Which real-time metrics (e.g. queue latency, thread usage, event telemetry) will be tracked?",
        description: "Provides runtime monitoring of background worker health and throughput.",
        is_mandatory: true
      }
    ];

    localStorage.setItem("mt_requirements", JSON.stringify(defaultRequirements));
    localStorage.setItem("mt_projects", JSON.stringify([
      { id: 1, name: "Markdown Translator App", description: "Demonstration project loaded in browser mock environment." }
    ]));
    localStorage.setItem("mt_answers", JSON.stringify([]));
    localStorage.setItem("mt_thoughts", JSON.stringify([]));
    localStorage.setItem("mt_seeded", "true");
  }

  // Getters/Setters
  const getReqs = () => JSON.parse(localStorage.getItem("mt_requirements") || "[]") as Requirement[];
  const setReqs = (data: Requirement[]) => localStorage.setItem("mt_requirements", JSON.stringify(data));
  const getProjs = () => JSON.parse(localStorage.getItem("mt_projects") || "[]") as Project[];
  const setProjs = (data: Project[]) => localStorage.setItem("mt_projects", JSON.stringify(data));
  const getAns = () => JSON.parse(localStorage.getItem("mt_answers") || "[]") as ProjectAnswer[];
  const setAns = (data: ProjectAnswer[]) => localStorage.setItem("mt_answers", JSON.stringify(data));
  const getThoughts = () => JSON.parse(localStorage.getItem("mt_thoughts") || "[]") as RawThoughtFile[];
  const setThoughts = (data: RawThoughtFile[]) => localStorage.setItem("mt_thoughts", JSON.stringify(data));

  switch (cmd) {
    case "get_requirements": {
      const specType = args?.specType;
      return getReqs().filter(r => r.spec_type === specType) as unknown as T;
    }
    case "save_requirement": {
      const req = args?.req as Requirement;
      const reqs = getReqs();
      if (req.id) {
        const idx = reqs.findIndex(r => r.id === req.id);
        if (idx !== -1) reqs[idx] = req;
      } else {
        req.id = Math.max(0, ...reqs.map(r => r.id || 0)) + 1;
        reqs.push(req);
      }
      setReqs(reqs);
      return undefined as unknown as T;
    }
    case "delete_requirement": {
      const id = args?.id as number;
      const reqs = getReqs().filter(r => r.id !== id);
      setReqs(reqs);
      return undefined as unknown as T;
    }
    case "get_projects": {
      return getProjs() as unknown as T;
    }
    case "create_project": {
      const name = args?.name as string;
      const description = args?.description as string | null;
      const projs = getProjs();
      const newProj = {
        id: Math.max(0, ...projs.map(p => p.id || 0)) + 1,
        name,
        description
      };
      projs.push(newProj);
      setProjs(projs);
      return newProj as unknown as T;
    }
    case "delete_project": {
      const id = args?.id as number;
      const projs = getProjs().filter(p => p.id !== id);
      setProjs(projs);
      
      const ans = getAns().filter(a => a.project_id !== id);
      setAns(ans);
      return undefined as unknown as T;
    }
    case "get_project_answers": {
      const projectId = args?.projectId as number;
      return getAns().filter(a => a.project_id === projectId) as unknown as T;
    }
    case "save_project_answer": {
      const projectId = args?.projectId as number;
      const key = args?.key as string;
      const text = args?.text as string;
      
      const ans = getAns();
      const idx = ans.findIndex(a => a.project_id === projectId && a.requirement_key === key);
      if (idx !== -1) {
        ans[idx].answer_text = text;
      } else {
        ans.push({
          id: Math.max(0, ...ans.map(a => a.id || 0)) + 1,
          project_id: projectId,
          requirement_key: key,
          answer_text: text,
          updated_at: new Date().toISOString()
        });
      }
      setAns(ans);
      return undefined as unknown as T;
    }
    case "save_raw_thought": {
      const content = args?.content as string;
      const description = args?.description as string;
      
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      
      const cleanDesc = description.toLowerCase().replace(/[^a-z0-9]+/g, '_').trim().replace(/(^_+|_+$)/g, '') || "thought";
      const filename = `${dateStr}_${cleanDesc}.txt`;
      
      const thoughts = getThoughts();
      thoughts.push({
        filename,
        date_str: date.toLocaleDateString(),
        description: description.replace(/_/g, ' '),
        path: `raw_thoughts/${filename}`
      });
      setThoughts(thoughts);
      
      localStorage.setItem(`thought_content_${filename}`, content);
      return filename as unknown as T;
    }
    case "list_raw_thoughts": {
      return getThoughts().sort((a, b) => b.filename.localeCompare(a.filename)) as unknown as T;
    }
    case "read_raw_thought": {
      const filename = args?.filename as string;
      return (localStorage.getItem(`thought_content_${filename}`) || "Mock content not found.") as unknown as T;
    }
    case "export_specification": {
      const filename = args?.filename as string;
      const content = args?.content as string;
      
      localStorage.setItem(`exported_spec_${filename}`, content);
      return `d:\\Dev\\Antigravity\\MarkdownTranslator\\${filename}` as unknown as T;
    }
    default:
      throw new Error(`Mock command "${cmd}" not implemented.`);
  }
}

// -----------------------------------------------------------------------------------
// CORE APP COMPONENT
// -----------------------------------------------------------------------------------
function App() {
  const [activeTab, setActiveTab] = useState<"workspace" | "archive" | "standards">("workspace");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const projs = await safeInvoke<Project[]>("get_projects");
      setProjects(projs);
      if (projs.length > 0 && selectedProjectId === null) {
        setSelectedProjectId(projs[0].id || null);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    try {
      const newProj = await safeInvoke<Project>("create_project", { 
        name: newProjectName, 
        description: newProjectDesc || null 
      });
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id || null);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowNewProjectModal(false);
    } catch (err) {
      alert(`Error creating project: ${err}`);
    }
  }

  return (
    <div className="app-container">
      {/* Upper Navigation Header */}
      <header className="app-header">
        <div className="logo-section">
          <FileText className="logo-icon" size={24} />
          <span className="app-title">Markdown Translator ⚡</span>
          {!isTauri && (
            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px' }}>
              BROWSER PROTOTYPE
            </span>
          )}
        </div>
        <nav className="app-nav">
          <button 
            className={`nav-btn ${activeTab === "workspace" ? "active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            <FileCode size={16} />
            Specs Workspace
          </button>
          <button 
            className={`nav-btn ${activeTab === "archive" ? "active" : ""}`}
            onClick={() => setActiveTab("archive")}
          >
            <BookOpen size={16} />
            Raw Thoughts Archive
          </button>
          <button 
            className={`nav-btn ${activeTab === "standards" ? "active" : ""}`}
            onClick={() => setActiveTab("standards")}
          >
            <Settings size={16} />
            Global Standards
          </button>
        </nav>
      </header>

      {/* Main View Manager */}
      <main className="app-content">
        {activeTab === "workspace" && (
          <WorkspaceView 
            projects={projects}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            onCreateProjectClick={() => setShowNewProjectModal(true)}
            loadProjects={loadProjects}
          />
        )}
        {activeTab === "archive" && <ArchiveView />}
        {activeTab === "standards" && <StandardsView />}
      </main>

      {/* Scaffolding Modal to Add Project */}
      {showNewProjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Create New Project</span>
              <button className="new-project-btn" onClick={() => setShowNewProjectModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input 
                className="form-input" 
                placeholder="e.g. Markdown Translator, Game Engine"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <input 
                className="form-input" 
                placeholder="A lightweight desktop utility built in Tauri..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
            </div>
            <div className="log-prompt-actions">
              <button className="btn btn-outline" onClick={() => setShowNewProjectModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateProject}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================================================================================
// SCREEN 1: SPECS WORKSPACE VIEW
// ===================================================================================
interface WorkspaceViewProps {
  projects: Project[];
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  onCreateProjectClick: () => void;
  loadProjects: () => void;
}

function WorkspaceView({ 
  projects, 
  selectedProjectId, 
  setSelectedProjectId, 
  onCreateProjectClick,
  loadProjects
}: WorkspaceViewProps) {
  const [specType, setSpecType] = useState<"APP_SPEC" | "WINDOW_SPEC" | "PROCESS_SPEC">("APP_SPEC");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  interface ChatMessage {
    id: string;
    sender: "assistant" | "user" | "system";
    text: string;
    reqKey?: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [nextUnmetIndex, setNextUnmetIndex] = useState<number>(-1);

  const [showLogModal, setShowLogModal] = useState(false);
  const [pendingAnswerText, setPendingAnswerText] = useState("");
  const [pendingReqKey, setPendingReqKey] = useState("");
  const [thoughtDescription, setThoughtDescription] = useState("");

  const [previewMode, setPreviewMode] = useState<"raw" | "rich">("rich");
  const [compiledMarkdown, setCompiledMarkdown] = useState("");
  const [isExported, setIsExported] = useState(false);

  useEffect(() => {
    loadRequirementsAndAnswers();
  }, [selectedProjectId, specType]);

  async function loadRequirementsAndAnswers() {
    if (!selectedProjectId) {
      setRequirements([]);
      setAnswers({});
      setChatMessages([]);
      return;
    }

    try {
      const reqs = await safeInvoke<Requirement[]>("get_requirements", { specType });
      const ansList = await safeInvoke<ProjectAnswer[]>("get_project_answers", { projectId: selectedProjectId });
      
      const ansMap: Record<string, string> = {};
      ansList.forEach(a => {
        ansMap[a.requirement_key] = a.answer_text;
      });

      setRequirements(reqs);
      setAnswers(ansMap);
      setIsExported(false);

      const unmetIndex = reqs.findIndex(r => r.is_mandatory && !ansMap[r.key_name]);
      setNextUnmetIndex(unmetIndex);

      const initMessages: ChatMessage[] = [
        {
          id: "welcome",
          sender: "assistant",
          text: `Welcome! Let's draft your **${specType}.md** specifications. I will audit your parameters against the SQLite active standard and prompt you for any missing items.`
        }
      ];

      if (unmetIndex === -1 && reqs.length > 0) {
        initMessages.push({
          id: "all_clear",
          sender: "system",
          text: `✔️ All mandatory criteria for ${specType}.md have been successfully answered. The compiled Markdown specification has been generated!`
        });
        setChatMessages(initMessages);
        compileSpecification(reqs, ansMap);
      } else if (unmetIndex !== -1) {
        const firstUnmet = reqs[unmetIndex];
        initMessages.push({
          id: `prompt-${firstUnmet.key_name}`,
          sender: "assistant",
          reqKey: firstUnmet.key_name,
          text: `Here is the first missing requirement:\n\n**${firstUnmet.title}**\n\n*Question*: ${firstUnmet.prompt_question}\n\n${firstUnmet.description || ""}`
        });
        setChatMessages(initMessages);
      }
    } catch (err) {
      console.error("Failed to load workspace parameters:", err);
    }
  }

  function compileSpecification(reqs: Requirement[], ansMap: Record<string, string>) {
    let md = `# ${specType === 'APP_SPEC' ? 'Application Design Specification (APP_SPEC)' : specType === 'WINDOW_SPEC' ? 'Contextual UI Design Specification (WINDOW_SPEC)' : 'Background Workers & Telemetry Specification (PROCESS_SPEC)'}\n\n`;
    
    md += `This specification defines the architectural standards, schemas, and processing boundaries for this project.\n\n`;
    md += `## Database & Schema Constraints\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> **Strict Lowercase Plural Snake_Case Convention**\n`;
    md += `> Every database table, column, index, and view must strictly use lowercase, plural \`snake_case\` names with zero tolerance for camelCase or singular names.\n\n`;

    reqs.forEach(r => {
      const answer = ansMap[r.key_name] || "_Not Provided_";
      md += `### ${r.title}\n`;
      md += `* **Standard Identifier**: \`${r.key_name}\`\n`;
      if (r.description) {
        md += `* **Requirements Directive**: ${r.description}\n`;
      }
      md += `\n${answer}\n\n`;
      md += `---\n\n`;
    });

    md += `*Generated automatically by Markdown Translator on ${new Date().toLocaleDateString()}.*`;
    setCompiledMarkdown(md);
  }

  function handleSendMessage() {
    if (!chatInput.trim() || nextUnmetIndex === -1) return;
    const currentUnmet = requirements[nextUnmetIndex];
    setPendingAnswerText(chatInput);
    setPendingReqKey(currentUnmet.key_name);
    setThoughtDescription(currentUnmet.title);
    setShowLogModal(true);
  }

  async function confirmAndSaveThought() {
    if (!selectedProjectId) return;
    
    try {
      const filename = await safeInvoke<string>("save_raw_thought", { 
        content: pendingAnswerText, 
        description: thoughtDescription 
      });

      await safeInvoke("save_project_answer", {
        projectId: selectedProjectId,
        key: pendingReqKey,
        text: pendingAnswerText
      });

      const updatedAnswers = { ...answers, [pendingReqKey]: pendingAnswerText };
      setAnswers(updatedAnswers);
      setChatInput("");
      setShowLogModal(false);

      const newUserMsg: ChatMessage = {
        id: `user-${pendingReqKey}`,
        sender: "user",
        text: pendingAnswerText
      };

      const systemMsg: ChatMessage = {
        id: `sys-${pendingReqKey}`,
        sender: "system",
        text: `✔️ Answer logged locally to "raw_thoughts/${filename}" and saved to SQLite!`
      };

      const nextIndex = requirements.findIndex(r => r.is_mandatory && !updatedAnswers[r.key_name]);
      setNextUnmetIndex(nextIndex);

      const nextMessages = [...chatMessages, newUserMsg, systemMsg];

      if (nextIndex === -1) {
        nextMessages.push({
          id: "compilation_done",
          sender: "assistant",
          text: "Fantastic! All required specifications have been successfully compiled. The markdown sheet is loaded in the right pane!"
        });
        setChatMessages(nextMessages);
        compileSpecification(requirements, updatedAnswers);
      } else {
        const nextUnmet = requirements[nextIndex];
        nextMessages.push({
          id: `prompt-${nextUnmet.key_name}`,
          sender: "assistant",
          reqKey: nextUnmet.key_name,
          text: `Got it. Here is the next missing requirement:\n\n**${nextUnmet.title}**\n\n*Question*: ${nextUnmet.prompt_question}\n\n${nextUnmet.description || ""}`
        });
        setChatMessages(nextMessages);
      }
    } catch (err) {
      alert(`Error saving parameters: ${err}`);
    }
  }

  async function handleExportSpec() {
    try {
      const filename = `${specType}.md`;
      const path = await safeInvoke<string>("export_specification", {
        filename,
        content: compiledMarkdown
      });
      setIsExported(true);
      
      setChatMessages([
        ...chatMessages,
        {
          id: `export-${Date.now()}`,
          sender: "system",
          text: `💾 Specification successfully exported and written directly to your workspace root at:\n${path}`
        }
      ]);
    } catch (err) {
      alert(`Failed to export spec file: ${err}`);
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) return;
    const confirm = window.confirm("Are you sure you want to delete this project and all its answered parameters?");
    if (!confirm) return;

    try {
      await safeInvoke("delete_project", { id: selectedProjectId });
      loadProjects();
    } catch (err) {
      alert(`Error deleting project: ${err}`);
    }
  }

  async function handleUpdateAnswer(reqKey: string, newText: string) {
    if (!selectedProjectId) return;
    try {
      await safeInvoke("save_project_answer", {
        projectId: selectedProjectId,
        key: reqKey,
        text: newText
      });
      const updatedAnswers = { ...answers, [reqKey]: newText };
      setAnswers(updatedAnswers);
      compileSpecification(requirements, updatedAnswers);
    } catch (err) {
      alert(`Error updating parameter: ${err}`);
    }
  }

  const isSpecReady = nextUnmetIndex === -1 && requirements.length > 0;

  return (
    <div style={{ height: "100%" }}>
      {/* Top Banner */}
      <div className="project-banner">
        <div className="project-selector-wrapper">
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Project:</span>
          <select 
            className="project-select"
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="new-project-btn" title="Create New Project" onClick={onCreateProjectClick}>
            <Plus size={14} />
          </button>
          {selectedProjectId && (
            <button className="nav-btn" style={{ padding: "4px", color: "var(--accent-rose)" }} title="Delete Project" onClick={handleDeleteProject}>
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="spec-type-selector">
          <button 
            className={`spec-type-tab ${specType === "APP_SPEC" ? "active" : ""}`}
            onClick={() => setSpecType("APP_SPEC")}
          >
            APP_SPEC.md
          </button>
          <button 
            className={`spec-type-tab ${specType === "WINDOW_SPEC" ? "active" : ""}`}
            onClick={() => setSpecType("WINDOW_SPEC")}
          >
            WINDOW_SPEC.md
          </button>
          <button 
            className={`spec-type-tab ${specType === "PROCESS_SPEC" ? "active" : ""}`}
            onClick={() => setSpecType("PROCESS_SPEC")}
          >
            PROCESS_SPEC.md
          </button>
        </div>
      </div>

      {/* Main Dual Pane Layout */}
      <div className="workspace-grid">
        {/* LEFT PANE: DUMP AND CONVERSATION */}
        <div className="pane left-pane">
          <div className="pane-header">
            <span className="pane-title">
              <Send size={14} />
              Raw Input & Conversation
            </span>
          </div>

          {/* SQLite Standards Checklist */}
          <div className="checklist-container">
            <div className="checklist-title">SQLite Standards Checklist</div>
            <div className="checklist-grid">
              {requirements.map(r => {
                const met = !!answers[r.key_name];
                return (
                  <div key={r.id} className={`checklist-item ${met ? "met" : "unmet"}`}>
                    {met ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {r.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Chat Console */}
          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                  {msg.sender === "assistant" && msg.reqKey && (
                    <span className="req-tag">MANDATORY STANDARD REQUIREMENT</span>
                  )}
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {msg.text.split("**").map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)}
                  </p>
                </div>
              ))}
            </div>

            {/* Conversation text submission */}
            {nextUnmetIndex !== -1 && (
              <div className="chat-input-area">
                <textarea 
                  className="chat-textarea"
                  placeholder="Paste or write your raw thoughts and brain-dump answers here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <div className="chat-controls">
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Press Submit to check in SQLite</span>
                  <button 
                    className="btn btn-primary"
                    disabled={!chatInput.trim()}
                    onClick={handleSendMessage}
                  >
                    Submit Dump
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: PRODUCTION-READY SPECIFICATION GENERATOR */}
        <div className="pane right-pane">
          <div className="pane-header">
            <span className="pane-title">
              <Eye size={14} />
              Markdown Specification Preview
            </span>
            <div className="pane-actions">
              {isSpecReady && (
                <>
                  <button 
                    className={`btn ${previewMode === "rich" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setPreviewMode("rich")}
                  >
                    Rich Preview
                  </button>
                  <button 
                    className={`btn ${previewMode === "raw" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setPreviewMode("raw")}
                  >
                    Raw MD
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={handleExportSpec}
                    disabled={isExported}
                  >
                    <Save size={14} />
                    {isExported ? "Spec Exported!" : "Export to Workspace"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
            {isSpecReady ? (
              previewMode === "raw" ? (
                <div className="markdown-editor-pane">
                  <textarea 
                    className="markdown-code-area"
                    value={compiledMarkdown}
                    onChange={(e) => setCompiledMarkdown(e.target.value)}
                  />
                </div>
              ) : (
                <div className="markdown-preview-wrapper">
                  <div dangerouslySetInnerHTML={{ 
                    __html: compiledMarkdown
                      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^\* \*\*(.*)\*\*: (.*$)/gim, '<li><strong>$1</strong>: $2</li>')
                      .replace(/^\* (.*$)/gim, '<li>$1</li>')
                      .replace(/---/g, '<hr style="border: 0; border-top: 1px solid var(--border-glass); margin: 1.5rem 0;" />')
                      .replace(/`([^`]+)`/g, '<code>$1</code>')
                      .replace(/\n\n/g, '<p></p>')
                  }} />
                  
                  {/* Live Parameter Inspector */}
                  <div style={{ marginTop: "2rem" }} className="spec-summary-list">
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      📝 Live Parameter Inspector (Quick Modifications)
                    </div>
                    {requirements.map(r => (
                      <div key={r.id} className="spec-summary-item">
                        <div className="spec-summary-title">{r.title}</div>
                        <textarea 
                          className="chat-textarea"
                          style={{ height: "60px", marginTop: "0.5rem" }}
                          value={answers[r.key_name] || ""}
                          onChange={(e) => handleUpdateAnswer(r.key_name, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="lock-screen">
                <AlertCircle className="lock-icon" size={48} />
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>Specification Compiler Locked</div>
                <div style={{ fontSize: "0.875rem", maxWidth: "340px" }}>
                  Please answer all mandatory database standards in the conversational chat wizard to compile and generate the **{specType}.md** file.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thought Filename Description Input Modal */}
      {showLogModal && (
        <div className="modal-overlay">
          <div className="log-prompt-card">
            <div className="log-prompt-title">
              <FolderOpen size={18} className="logo-icon" />
              <span>Log Raw Thought Dump</span>
            </div>
            <p className="log-prompt-text">
              The application automatically logs every text stream dump. Please enter a brief 2-3 word description to save the file.
            </p>
            <div className="form-group">
              <label className="form-label">Filenames: YYYYMMDD_description.txt</label>
              <input 
                className="log-input"
                placeholder="e.g. database choice, layout margins"
                value={thoughtDescription}
                onChange={(e) => setThoughtDescription(e.target.value)}
                autoFocus
              />
            </div>
            <div className="log-prompt-actions">
              <button className="btn btn-outline" onClick={() => setShowLogModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary"
                disabled={!thoughtDescription.trim()}
                onClick={confirmAndSaveThought}
              >
                Log File & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================================================================================
// SCREEN 2: 3rd VIEW - READ-ONLY RAW THOUGHTS ARCHIVE
// ===================================================================================
function ArchiveView() {
  const [thoughts, setThoughts] = useState<RawThoughtFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RawThoughtFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadThoughts();
  }, []);

  async function loadThoughts() {
    try {
      const files = await safeInvoke<RawThoughtFile[]>("list_raw_thoughts");
      setThoughts(files);
      if (files.length > 0 && selectedFile === null) {
        handleSelectFile(files[0]);
      }
    } catch (err) {
      console.error("Failed to read raw thoughts folder:", err);
    }
  }

  async function handleSelectFile(file: RawThoughtFile) {
    setSelectedFile(file);
    setLoading(true);
    try {
      const text = await safeInvoke<string>("read_raw_thought", { filename: file.filename });
      setFileContent(text);
    } catch (err) {
      setFileContent(`Error reading file: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredThoughts = thoughts.filter(t => 
    t.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="archive-container">
      <div className="archive-sidebar">
        <div className="archive-search-box">
          <input 
            className="archive-search-input"
            placeholder="Search raw files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="archive-list">
          {filteredThoughts.map(file => (
            <div 
              key={file.filename}
              className={`archive-item ${selectedFile?.filename === file.filename ? "selected" : ""}`}
              onClick={() => handleSelectFile(file)}
            >
              <span className="archive-item-date">{file.date_str}</span>
              <span className="archive-item-name">{file.description}</span>
              <span className="archive-item-file">{file.filename}</span>
            </div>
          ))}
          {filteredThoughts.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2rem" }}>
              No log files found.
            </div>
          )}
        </div>
      </div>

      <div className="archive-viewer">
        <div className="pane-header">
          <span className="pane-title">
            <BookOpen size={14} />
            {selectedFile ? `Reading: ${selectedFile.filename}` : "Raw Thoughts Inspector"}
          </span>
        </div>
        
        {selectedFile ? (
          loading ? (
            <div className="archive-viewer-placeholder">
              <span>Loading file content...</span>
            </div>
          ) : (
            <pre className="archive-viewer-content">{fileContent}</pre>
          )
        ) : (
          <div className="archive-viewer-placeholder">
            <FolderPlus size={36} style={{ opacity: 0.2 }} />
            <span>Select a raw thought file from the sidebar to inspect its history.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================================================
// SCREEN 3: SETTINGS VIEW - GLOBAL STANDARDS CRUD (Objective 1)
// ===================================================================================
function StandardsView() {
  const [activeSpecTab, setActiveSpecTab] = useState<"APP_SPEC" | "WINDOW_SPEC" | "PROCESS_SPEC">("APP_SPEC");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  const [title, setTitle] = useState("");
  const [keyName, setKeyName] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);

  useEffect(() => {
    loadRequirements();
  }, [activeSpecTab]);

  async function loadRequirements() {
    try {
      const data = await safeInvoke<Requirement[]>("get_requirements", { specType: activeSpecTab });
      setRequirements(data);
    } catch (err) {
      console.error("Failed to load global parameters:", err);
    }
  }

  function handleOpenCreateModal() {
    setEditingReq(null);
    setTitle("");
    setKeyName("");
    setQuestion("");
    setDescription("");
    setIsMandatory(true);
    setShowModal(true);
  }

  function handleOpenEditModal(req: Requirement) {
    setEditingReq(req);
    setTitle(req.title);
    setKeyName(req.key_name);
    setQuestion(req.prompt_question);
    setDescription(req.description || "");
    setIsMandatory(req.is_mandatory);
    setShowModal(true);
  }

  async function handleSaveRequirement() {
    if (!title.trim() || !keyName.trim() || !question.trim()) {
      alert("Please fill in the required fields (Title, Identifier Key, and Question Prompt).");
      return;
    }

    const reqData: Requirement = {
      id: editingReq?.id,
      spec_type: activeSpecTab,
      key_name: keyName.trim().replace(/\s+/g, "_").toLowerCase(),
      title: title.trim(),
      prompt_question: question.trim(),
      description: description.trim() || null,
      is_mandatory: isMandatory
    };

    try {
      await safeInvoke("save_requirement", { req: reqData });
      setShowModal(false);
      loadRequirements();
    } catch (err) {
      alert(`Error saving standard: ${err}`);
    }
  }

  async function handleDeleteRequirement(id: number) {
    const confirm = window.confirm("Are you sure you want to permanently delete this global specification standard?");
    if (!confirm) return;

    try {
      await safeInvoke("delete_requirement", { id });
      loadRequirements();
    } catch (err) {
      alert(`Error deleting standard: ${err}`);
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", padding: "0.5rem" }}>
          Specification Templates
        </div>
        <button 
          className={`settings-tab-btn ${activeSpecTab === "APP_SPEC" ? "active" : ""}`}
          onClick={() => setActiveSpecTab("APP_SPEC")}
        >
          APP_SPEC.md Standards
        </button>
        <button 
          className={`settings-tab-btn ${activeSpecTab === "WINDOW_SPEC" ? "active" : ""}`}
          onClick={() => setActiveSpecTab("WINDOW_SPEC")}
        >
          WINDOW_SPEC.md Standards
        </button>
        <button 
          className={`settings-tab-btn ${activeSpecTab === "PROCESS_SPEC" ? "active" : ""}`}
          onClick={() => setActiveSpecTab("PROCESS_SPEC")}
        >
          PROCESS_SPEC.md Standards
        </button>
      </div>

      <div className="settings-main">
        <div className="settings-section-title">
          <span>{activeSpecTab} Global Template Criteria</span>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={14} />
            Add Requirement Standard
          </button>
        </div>

        <div className="requirements-list">
          {requirements.map(req => (
            <div key={req.id} className="requirement-card">
              <div className="requirement-card-header">
                <div className="requirement-card-title-group">
                  <span className="requirement-card-title">
                    {req.title}
                    <span className={`badge ${req.is_mandatory ? 'badge-mandatory' : 'badge-optional'}`}>
                      {req.is_mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </span>
                  <span className="requirement-card-key">Key: {req.key_name}</span>
                </div>
                <div className="requirement-card-actions">
                  <button className="btn btn-outline" style={{ padding: "0.3rem" }} onClick={() => handleOpenEditModal(req)}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: "0.3rem", color: "var(--accent-rose)" }} onClick={() => req.id && handleDeleteRequirement(req.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="requirement-card-body">
                <div className="requirement-question">
                  <strong>Conversational Question Asked:</strong><br />
                  {req.prompt_question}
                </div>
                {req.description && (
                  <div className="requirement-desc">
                    <strong>Standard Directive:</strong> {req.description}
                  </div>
                )}
              </div>
            </div>
          ))}

          {requirements.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "4rem" }}>
              No requirements configured. Click "Add Requirement Standard" to build your custom SQLite criteria.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit standard template Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: "520px" }}>
            <div className="modal-header">
              <span>{editingReq ? "Edit Global Standard" : "Add Global Standard"}</span>
              <button className="new-project-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Requirement Title</label>
              <input 
                className="form-input" 
                placeholder="e.g. Embedded Storage Engine"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unique Identifier Key (lowercase snake_case)</label>
              <input 
                className="form-input" 
                placeholder="e.g. embedded_db"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                disabled={!!editingReq}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Conversational Question Prompt</label>
              <input 
                className="form-input" 
                placeholder="What Rust-backed database engine will be embedded?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Directive Description (Optional)</label>
              <textarea 
                className="chat-textarea"
                style={{ height: "60px" }}
                placeholder="Enforces defining the local storage boundaries..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-checkbox-group" onClick={() => setIsMandatory(!isMandatory)}>
              <input 
                type="checkbox"
                className="form-checkbox"
                checked={isMandatory}
                onChange={() => {}}
              />
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Enforce as Mandatory Specification Requirement</span>
            </div>

            <div className="log-prompt-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRequirement}>Save Standard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
