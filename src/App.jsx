import React, { useState, useEffect, useCallback } from "react";

// ============================================================
// GEMINI CONFIG
// ============================================================
async function analyzeWithGemini(base64Image, mimeType) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image, mimeType }),
  });
  return response.json();
}
// ============================================================
// CUENTAS
// ============================================================
const JUDGE_PASSWORD = "juez2024";
const TEAMS_KEY = "lobina_teams";
const RECORDS_KEY = "lobina_records";

function getTeams() {
  try {
    return JSON.parse(localStorage.getItem(TEAMS_KEY) || "[]");
  } catch { return []; }
}

function saveTeam(name, password) {
  const teams = getTeams();
  if (teams.find(t => t.name.toLowerCase() === name.toLowerCase())) return false;
  teams.push({ name, password });
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  return true;
}

function verifyTeam(name, password) {
  const teams = getTeams();
  return teams.find(t => t.name.toLowerCase() === name.toLowerCase() && t.password === password);
}

// ============================================================
// REGISTROS
// ============================================================
function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
  } catch { return []; }
}

function saveRecord(record) {
  const records = getRecords();
  const newRecord = {
    ...record,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    status: "pendiente",
  };
  records.unshift(newRecord);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  return newRecord;
}

function updateRecord(id, changes) {
  const records = getRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...changes };
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return records[idx];
  }
  return null;
}

function deleteRecord(id) {
  const records = getRecords().filter(r => r.id !== id);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

// ============================================================
// UTILIDADES
// ============================================================
function cmToInches(cm) { return (cm / 2.54).toFixed(2); }

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function exportCSV(records) {
  const header = "Equipo,Hora,Largo (cm),Largo (pulg),Estado,Notas";
  const rows = records.map(r =>
    `"${r.team}","${formatTime(r.created_at)}","${r.largo_cm ?? ""}","${r.largo_in ?? ""}","${r.status}","${r.notas ?? ""}"`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `torneo_lobina_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// ESTILOS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0f0d;
    --surface: #111a15;
    --surface2: #1a2820;
    --border: #2a3d30;
    --accent: #2dff6e;
    --accent2: #ff3d3d;
    --gold: #f5c842;
    --text: #e8f0eb;
    --muted: #6b8a72;
    --font-display: 'Black Han Sans', sans-serif;
    --font-body: 'Barlow', sans-serif;
    --font-cond: 'Barlow Condensed', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    background: var(--surface);
    border-bottom: 2px solid var(--border);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-logo {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--accent);
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-logo span { color: var(--text); font-size: 13px; font-family: var(--font-body); font-weight: 500; opacity: 0.6; }
  .header-user { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }

  .badge {
    font-family: var(--font-cond);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 3px 8px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .badge-judge { background: var(--gold); color: #000; }
  .badge-team { background: var(--accent); color: #000; }
  .badge-pendiente { background: #3a3a1a; color: var(--gold); }
  .badge-validado { background: #1a3a1a; color: var(--accent); }
  .badge-rechazado { background: #3a1a1a; color: var(--accent2); }

  .main { flex: 1; padding: 20px; max-width: 900px; margin: 0 auto; width: 100%; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 16px;
  }
  .card-title {
    font-family: var(--font-cond);
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; }
  .form-input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 12px 14px;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
  }
  .form-input:focus { border-color: var(--accent); }
  .form-input::placeholder { color: var(--muted); }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 1px;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { background: #25e860; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: var(--accent2); color: #fff; }
  .btn-gold { background: var(--gold); color: #000; }
  .btn-sm { padding: 7px 12px; font-size: 12px; }
  .btn-full { width: 100%; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .login-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 50% 0%, #0d2a1a 0%, transparent 60%);
  }
  .login-logo { font-family: var(--font-display); font-size: 48px; color: var(--accent); text-align: center; margin-bottom: 4px; }
  .login-sub { font-family: var(--font-cond); font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 40px; }
  .login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; width: 100%; max-width: 380px; }
  .login-tabs { display: flex; margin-bottom: 24px; background: var(--surface2); border-radius: 8px; padding: 4px; gap: 4px; }
  .login-tab {
    flex: 1; padding: 9px; border-radius: 6px; border: none;
    background: transparent; color: var(--muted);
    font-family: var(--font-cond); font-weight: 700; font-size: 13px;
    letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.15s;
  }
  .login-tab.active { background: var(--accent); color: #000; }
  .error-msg { color: var(--accent2); font-size: 13px; margin-top: 8px; }
  .success-msg { color: var(--accent); font-size: 13px; margin-top: 8px; }

  .upload-zone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: #0d1f14; }
  .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .upload-icon { font-size: 40px; margin-bottom: 8px; }
  .upload-text { font-family: var(--font-cond); font-size: 16px; font-weight: 700; color: var(--muted); }
  .upload-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

  .img-preview {
    width: 100%; max-height: 320px; object-fit: contain;
    border-radius: 10px; border: 1px solid var(--border);
    background: #000; margin-bottom: 12px;
  }

  .analysis-result { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-top: 12px; }
  .measurement-big { font-family: var(--font-display); font-size: 52px; color: var(--accent); line-height: 1; }
  .measurement-in { font-family: var(--font-cond); font-size: 22px; color: var(--muted); margin-top: 2px; }
  .confidence-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 8px; }
  .conf-alta { background: #1a3a1a; color: var(--accent); }
  .conf-media { background: #3a3a1a; color: var(--gold); }
  .conf-baja { background: #3a1a1a; color: var(--accent2); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th {
    font-family: var(--font-cond); font-size: 11px; font-weight: 800;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted);
    padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  td { padding: 12px; border-bottom: 1px solid #1a2820; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #0d1a10; }
  .team-name { font-weight: 600; color: var(--text); }
  .measure-cell { font-family: var(--font-cond); font-size: 18px; font-weight: 700; color: var(--accent); }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    z-index: 200; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 28px; width: 100%; max-width: 520px;
    max-height: 90vh; overflow-y: auto;
  }
  .modal-title { font-family: var(--font-cond); font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); margin-bottom: 20px; }

  .tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--surface2); padding: 4px; border-radius: 10px; }
  .tab { flex: 1; padding: 10px; border: none; background: transparent; color: var(--muted); font-family: var(--font-cond); font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border-radius: 7px; transition: all 0.15s; }
  .tab.active { background: var(--accent); color: #000; }

  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
  .stat-num { font-family: var(--font-display); font-size: 32px; color: var(--accent); }
  .stat-label { font-family: var(--font-cond); font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

  .spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .analyzing { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; color: var(--muted); font-family: var(--font-cond); font-size: 15px; letter-spacing: 1px; text-transform: uppercase; }

  .empty { text-align: center; padding: 48px 20px; color: var(--muted); font-family: var(--font-cond); font-size: 16px; letter-spacing: 1px; }

  @media (max-width: 600px) {
    .stat-num { font-size: 24px; }
    .main { padding: 12px; }
    .card { padding: 16px; }
    .measurement-big { font-size: 40px; }
  }
`;

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState("team");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = () => {
    setError(""); setSuccess("");
    if (tab === "judge") {
      if (pass === JUDGE_PASSWORD) {
        onLogin({ role: "judge", name: "Juez" });
      } else {
        setError("Contraseña incorrecta.");
      }
    } else if (tab === "team") {
      if (!name.trim()) { setError("Ingresa tu nombre de equipo."); return; }
      if (!pass.trim()) { setError("Ingresa tu contraseña."); return; }
      const team = verifyTeam(name.trim(), pass);
      if (team) {
        onLogin({ role: "team", name: team.name });
      } else {
        setError("Equipo o contraseña incorrectos.");
      }
    } else if (tab === "register") {
      if (!name.trim()) { setError("Ingresa nombre de equipo."); return; }
      if (pass.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
      if (pass !== pass2) { setError("Las contraseñas no coinciden."); return; }
      const ok = saveTeam(name.trim(), pass);
      if (ok) {
        setSuccess("¡Equipo registrado! Ya puedes iniciar sesión.");
        setTab("team");
        setName(""); setPass(""); setPass2("");
      } else {
        setError("Ese nombre de equipo ya existe.");
      }
    }
  };

  return (
    <div className="login-screen">
      <div className="login-logo">🎣 LOBINA</div>
      <div className="login-sub">Sistema de Torneo</div>
      <div className="login-card">
        <div className="login-tabs">
          <button className={`login-tab ${tab === "team" ? "active" : ""}`} onClick={() => { setTab("team"); setError(""); setSuccess(""); }}>Equipo</button>
          <button className={`login-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setError(""); setSuccess(""); }}>Registro</button>
          <button className={`login-tab ${tab === "judge" ? "active" : ""}`} onClick={() => { setTab("judge"); setError(""); setSuccess(""); }}>Juez</button>
        </div>

        {tab !== "judge" && (
          <div className="form-group">
            <label className="form-label">Nombre de Equipo</label>
            <input className="form-input" placeholder="Ej: Los Tiburones" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{tab === "judge" ? "Contraseña del Juez" : "Contraseña"}</label>
          <input className="form-input" type="password" placeholder="••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>

        {tab === "register" && (
          <div className="form-group">
            <label className="form-label">Confirmar Contraseña</label>
            <input className="form-input" type="password" placeholder="••••••" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
        )}

        {error && <div className="error-msg">⚠ {error}</div>}
        {success && <div className="success-msg">✓ {success}</div>}

        <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleLogin}>
          {tab === "register" ? "Registrar Equipo" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// UPLOAD & ANALYZE
// ============================================================
function UploadAnalyze({ user }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [manualCm, setManualCm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setManualCm(""); setDone(false);
    setPreview(URL.createObjectURL(f));
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await analyzeWithGemini(b64, file.type);
      setResult(res);
      if (res.largo_cm) setManualCm(parseFloat(res.largo_cm).toFixed(1));
    } catch {
      setResult({ pelota_encontrada: false, pez_encontrado: false, largo_cm: null, notas: "Error de conexión con IA." });
    }
    setAnalyzing(false);
  };

  const submit = () => {
    const cm = parseFloat(manualCm);
    if (!cm || isNaN(cm)) { alert("Ingresa una medición válida."); return; }
    setSubmitting(true);
    saveRecord({
      team: user.name,
      largo_cm: cm.toFixed(1),
      largo_in: cmToInches(cm),
      notas: result?.notas || "",
      confianza: result?.confianza || "manual",
      image_data: preview,
    });
    setTimeout(() => { setSubmitting(false); setDone(true); }, 500);
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setManualCm(""); setDone(false); };

  if (done) return (
    <div className="card" style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 60 }}>🎣</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent)", marginTop: 12 }}>¡Registro enviado!</div>
      <div style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>El juez revisará y validará tu captura.</div>
      <button className="btn btn-secondary" style={{ marginTop: 24 }} onClick={reset}>Registrar otra</button>
    </div>
  );

  return (
    <div className="card">
      <div className="card-title">📸 Nueva Captura</div>

      {!preview ? (
        <div
          className={`upload-zone ${drag ? "drag" : ""}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <input type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files[0])} />
          <div className="upload-icon">📷</div>
          <div className="upload-text">Tomar foto o seleccionar</div>
          <div className="upload-sub">Asegúrate de incluir la pelotita roja de 3 cm</div>
        </div>
      ) : (
        <div>
          <img src={preview} className="img-preview" alt="preview" />
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={reset}>Cambiar foto</button>
            {!result && !analyzing && (
              <button className="btn btn-primary btn-sm" onClick={analyze}>🔍 Analizar con IA</button>
            )}
          </div>

          {analyzing && (
            <div className="analyzing">
              <div className="spinner" />
              Analizando imagen...
            </div>
          )}

          {result && (
            <div className="analysis-result">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-cond)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Medición IA</div>
                  {result.largo_cm ? (
                    <>
                      <div className="measurement-big">{parseFloat(result.largo_cm).toFixed(1)} <span style={{ fontSize: 20 }}>cm</span></div>
                      <div className="measurement-in">{cmToInches(result.largo_cm)}"</div>
                    </>
                  ) : (
                    <div style={{ color: "var(--accent2)", fontFamily: "var(--font-cond)", fontSize: 16 }}>No se pudo detectar</div>
                  )}
                  {result.confianza && (
                    <span className={`confidence-badge conf-${result.confianza}`}>Confianza {result.confianza}</span>
                  )}
                </div>
                <div style={{ fontSize: 24 }}>
                  {result.pelota_encontrada ? "🔴✓" : "🔴✗"} {result.pez_encontrado ? "🐟✓" : "🐟✗"}
                </div>
              </div>
              {result.notas && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  {result.notas}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label className="form-label">Medición final (cm) — edita si es necesario</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                type="number"
                step="0.1"
                placeholder="Ej: 42.5"
                value={manualCm}
                onChange={e => setManualCm(e.target.value)}
                style={{ flex: 1 }}
              />
              {manualCm && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", fontFamily: "var(--font-cond)", fontSize: 14, whiteSpace: "nowrap" }}>
                  {cmToInches(manualCm)}"
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={submit} disabled={submitting || !manualCm}>
              {submitting ? <><span className="spinner" /> Enviando...</> : "📤 Enviar al juez"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
function EditModal({ record, onClose, onSave }) {
  const [cm, setCm] = useState(record.largo_cm || "");
  const [status, setStatus] = useState(record.status || "pendiente");
  const [nota, setNota] = useState(record.notas || "");

  const save = () => {
    updateRecord(record.id, {
      largo_cm: parseFloat(cm).toFixed(1),
      largo_in: cmToInches(cm),
      status,
      notas: nota,
    });
    onSave();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">✏️ Editar Registro</div>
        <div style={{ fontFamily: "var(--font-cond)", fontSize: 18, fontWeight: 700, color: "var(--gold)", marginBottom: 16 }}>
          🎣 {record.team} — {formatTime(record.created_at)}
        </div>
        {record.image_data && (
          <img src={record.image_data} style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, marginBottom: 16, background: "#000" }} alt="captura" />
        )}
        <div className="form-group">
          <label className="form-label">Largo (cm)</label>
          <input className="form-input" type="number" step="0.1" value={cm} onChange={e => setCm(e.target.value)} />
          {cm && <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>{cmToInches(cm)} pulgadas</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="validado">Validado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notas del juez</label>
          <input className="form-input" placeholder="Observaciones..." value={nota} onChange={e => setNota(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JUDGE PANEL
// ============================================================
function JudgePanel() {
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [imgModal, setImgModal] = useState(null);

  const load = useCallback(() => setRecords(getRecords()), []);
  useEffect(() => { load(); }, [load]);

  const filtered = filter === "todos" ? records : records.filter(r => r.status === filter);
  const stats = {
    total: records.length,
    pendiente: records.filter(r => r.status === "pendiente").length,
    validado: records.filter(r => r.status === "validado").length,
  };

  const quickStatus = (id, status) => { updateRecord(id, { status }); load(); };
  const del = (id) => { if (!confirm("¿Eliminar este registro?")) return; deleteRecord(id); load(); };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--gold)" }}>{stats.pendiente}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--accent)" }}>{stats.validado}</div>
          <div className="stat-label">Validados</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div className="card-title" style={{ margin: 0 }}>📋 Registros</div>
          <button className="btn btn-gold btn-sm" onClick={() => exportCSV(filtered)}>⬇ Exportar CSV</button>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {["todos", "pendiente", "validado", "rechazado"].map(f => (
            <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">Sin registros {filter !== "todos" ? `"${filter}"` : ""}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Hora</th>
                  <th>Largo</th>
                  <th>Estado</th>
                  <th>Foto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><div className="team-name">{r.team}</div></td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{formatTime(r.created_at)}</td>
                    <td>
                      <div className="measure-cell">{r.largo_cm} cm</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.largo_in}"</div>
                    </td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td>
                      {r.image_data && (
                        <img src={r.image_data} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border)" }} onClick={() => setImgModal(r)} alt="" />
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}>✏️</button>
                        {r.status !== "validado" && <button className="btn btn-sm" style={{ background: "#1a3a1a", color: "var(--accent)" }} onClick={() => quickStatus(r.id, "validado")}>✓</button>}
                        {r.status !== "rechazado" && <button className="btn btn-sm" style={{ background: "#3a1a1a", color: "var(--accent2)" }} onClick={() => quickStatus(r.id, "rechazado")}>✗</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditModal record={editing} onClose={() => setEditing(null)} onSave={load} />}

      {imgModal && (
        <div className="modal-overlay" onClick={() => setImgModal(null)}>
          <div style={{ maxWidth: 700, width: "100%", padding: 20 }}>
            <img src={imgModal.image_data} style={{ width: "100%", borderRadius: 12, border: "2px solid var(--border)" }} alt="" />
            <div style={{ textAlign: "center", marginTop: 12, color: "var(--muted)", fontFamily: "var(--font-cond)", fontSize: 14 }}>
              {imgModal.team} — {formatTime(imgModal.created_at)} — {imgModal.largo_cm} cm
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TEAM HISTORY
// ============================================================
function TeamHistory({ user }) {
  const [records, setRecords] = useState([]);
  useEffect(() => {
    setRecords(getRecords().filter(r => r.team === user.name));
  }, [user.name]);

  return (
    <div className="card">
      <div className="card-title">📊 Mis Capturas</div>
      {records.length === 0 ? (
        <div className="empty">Aún no tienes capturas registradas.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Largo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{formatTime(r.created_at)}</td>
                  <td>
                    <div className="measure-cell">{r.largo_cm} cm</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.largo_in}"</div>
                  </td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("upload");

  const logout = () => { setUser(null); setTab("upload"); };

  if (!user) return (
    <>
      <style>{styles}</style>
      <LoginScreen onLogin={setUser} />
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">
            🎣 LOBINA
            <span>Torneo</span>
          </div>
          <div className="header-user">
            <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{user.name}</span>
            <span className={`badge ${user.role === "judge" ? "badge-judge" : "badge-team"}`}>
              {user.role === "judge" ? "Juez" : "Equipo"}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>Salir</button>
          </div>
        </header>

        <main className="main">
          {user.role === "judge" ? (
            <JudgePanel />
          ) : (
            <>
              <div className="tabs">
                <button className={`tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>📸 Nueva</button>
                <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>📋 Mis capturas</button>
              </div>
              {tab === "upload" ? <UploadAnalyze user={user} /> : <TeamHistory user={user} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
