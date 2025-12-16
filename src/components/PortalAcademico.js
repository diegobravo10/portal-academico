import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://104.197.98.193:3000";

export default function PortalAcademico() {
  const [view, setView] = useState("login"); // login | register | dashboard
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", text: "" });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "client",
  });

  const [categories, setCategories] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState("");

  const showAlert = (type, text) => {
    setAlert({ type, text });
    setTimeout(() => setAlert({ type: "", text: "" }), 3500);
  };

  // Restaurar sesión
  useEffect(() => {
    const saved = localStorage.getItem("academicUser");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setView("dashboard");
    }
  }, []);

  // Cargar data cuando hay usuario
  useEffect(() => {
    if (!user) return;
    loadCategories();
    loadResources();
  }, [user]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      showAlert("error", "No se pudieron cargar categorías");
    }
  };

  const loadResources = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resources`);
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (e) {
      showAlert("error", "No se pudieron cargar recursos");
    }
  };

  // ========== AUTH ==========
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      showAlert("error", "Completa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem("academicUser", JSON.stringify(data.user));
        setView("dashboard");
        showAlert("success", "Sesión iniciada correctamente");
      } else {
        showAlert("error", data.error || "Credenciales incorrectas");
      }
    } catch (e) {
      showAlert("error", "Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const { username, email, password, confirmPassword, role } = registerForm;

    if (!username || !email || !password || !confirmPassword) {
      showAlert("error", "Completa todos los campos");
      return;
    }
    if (password.length < 6) {
      showAlert("error", "La contraseña debe tener mínimo 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        showAlert("success", "Registro exitoso. Ahora inicia sesión.");
        setView("login");
        setRegisterForm({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "client",
        });
      } else {
        showAlert("error", data.error || "Error al registrar usuario");
      }
    } catch (e) {
      showAlert("error", "Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("academicUser");
    setResources([]);
    setCategories([]);
    setSelectedCategory("all");
    setUploadFile(null);
    setUploadCategory("");
    setView("login");
    showAlert("success", "Sesión cerrada");
  };

  // ========== UPLOAD ==========
  const handleUpload = async () => {
    if (!uploadFile || !uploadCategory) {
      showAlert("error", "Selecciona archivo y categoría");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("user_id", user.id);
      form.append("category_id", uploadCategory);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        showAlert("success", "Archivo subido correctamente");
        setUploadFile(null);
        setUploadCategory("");
        await loadResources();
      } else {
        showAlert("error", data.error || "Error al subir archivo");
      }
    } catch (e) {
      showAlert("error", "Error de conexión al subir archivo");
    } finally {
      setLoading(false);
    }
  };

  // Recursos SOLO del usuario logueado
  const myResources = useMemo(() => {
    if (!user) return [];
    const mine = resources.filter((r) => r.user_id === user.id);
    if (selectedCategory === "all") return mine;
    return mine.filter((r) => r.category_id === parseInt(selectedCategory));
  }, [resources, user, selectedCategory]);

  // ========== UI ==========
  if (view === "login") {
    return (
      <div className="page">
        <div className="card auth">
          <h1>Portal Académico</h1>
          <p className="subtitle">Inicia sesión para gestionar tus recursos</p>

          <label>Correo</label>
          <input
            type="email"
            placeholder="usuario@ejemplo.com"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
          />

          <label>Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <button disabled={loading} onClick={handleLogin}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>

          <p className="hint">
            ¿No tienes cuenta?{" "}
            <span className="link" onClick={() => setView("register")}>
              Regístrate
            </span>
          </p>
        </div>

        {alert.text && <Toast alert={alert} />}
      </div>
    );
  }

  if (view === "register") {
    return (
      <div className="page">
        <div className="card auth">
          <h1>Crear Cuenta</h1>
          <p className="subtitle">Registro de usuario</p>

          <label>Usuario</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
          />

          <label>Correo</label>
          <input
            type="email"
            placeholder="usuario@ejemplo.com"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
          />

          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
          />

          <label>Confirmar Contraseña</label>
          <input
            type="password"
            placeholder="Repite tu contraseña"
            value={registerForm.confirmPassword}
            onChange={(e) =>
              setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
            }
          />

          <label>Rol</label>
          <select
            value={registerForm.role}
            onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
          >
            <option value="client">Cliente</option>
            <option value="admin">Administrador</option>
          </select>

          <button disabled={loading} onClick={handleRegister}>
            {loading ? "Registrando..." : "Registrar"}
          </button>

          <p className="hint">
            ¿Ya tienes cuenta?{" "}
            <span className="link" onClick={() => setView("login")}>
              Inicia sesión
            </span>
          </p>
        </div>

        {alert.text && <Toast alert={alert} />}
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h2>Portal Académico</h2>
          <p className="subtitle">Bienvenido, {user?.username}</p>
        </div>
        <button className="danger" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </header>

      <main className="container">
        <section className="card section">
          <h3>Subir Recurso</h3>

          <div className="grid2">
            <div>
              <label>Archivo</label>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              {uploadFile && <small>Seleccionado: {uploadFile.name}</small>}
            </div>

            <div>
              <label>Categoría</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button disabled={loading} onClick={handleUpload}>
            {loading ? "Subiendo..." : "Subir Archivo"}
          </button>
        </section>

        <section className="card section">
          <div className="row">
            <h3>Mis Recursos</h3>

            <div className="filter">
              <label>Filtrar:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {myResources.length === 0 ? (
            <p className="empty">No tienes recursos aún. Sube tu primer archivo.</p>
          ) : (
            <div className="cards">
              {myResources.map((r) => (
                <div key={r.id} className="resource">
                  <div className="resource-info">
                    <strong className="truncate">{r.title}</strong>
                    <small>{new Date(r.created_at).toLocaleDateString()}</small>
                  </div>

                  <a
                    className="linkbtn"
                    href={`${API_URL}${r.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver / Descargar
                  </a>

                  {/* Preview simple para imágenes / video */}
                  {r.content_type?.startsWith("image/") && (
                    <img
                      className="preview"
                      src={`${API_URL}${r.file_url}`}
                      alt={r.title}
                    />
                  )}

                  {r.content_type?.startsWith("video/") && (
                    <video className="preview" controls>
                      <source src={`${API_URL}${r.file_url}`} type={r.content_type} />
                    </video>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {alert.text && <Toast alert={alert} />}
    </div>
  );
}

// Toast simple
function Toast({ alert }) {
  return (
    <div className={`toast ${alert.type === "success" ? "ok" : "bad"}`}>
      {alert.text}
    </div>
  );
}
