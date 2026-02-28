const ADMIN_PASSWORD = "N1B";
const ADMIN_AUTH_KEY = "catalogoAdminAuth";
const DATA_KEY = "catalogoAdminDataV1";
const SNAPSHOT_KEY = "catalogoSnapshotDataV1";

const $ = (id) => document.getElementById(id);

function leerData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.productos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function leerSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.productos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function guardarData(productos) {
  const payload = {
    version: 1,
    actualizadoEn: new Date().toISOString(),
    productos
  };
  localStorage.setItem(DATA_KEY, JSON.stringify(payload));
}

function asegurarDataInicial() {
  const dataActual = leerData();
  if (dataActual && Array.isArray(dataActual.productos) && dataActual.productos.length) {
    return dataActual.productos;
  }

  const snapshot = leerSnapshot();
  if (snapshot && snapshot.productos.length) {
    guardarData(snapshot.productos);
    return snapshot.productos;
  }

  return [];
}

function mostrarMensaje(texto, esError = false) {
  const el = $("mensaje");
  if (!el) return;
  el.textContent = texto;
  el.style.color = esError ? "#991b1b" : "#166534";
}

function parsearRutas(valor) {
  return String(valor || "")
    .split(/[\n,]/g)
    .map(v => v.trim())
    .filter(Boolean);
}

function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function obtenerImagenesFormulario() {
  const rutas = parsearRutas($("imagenesUrls").value);
  const files = Array.from($("imagenesFiles").files || []);

  if (!files.length) {
    return rutas;
  }

  const base64 = await Promise.all(files.map(archivoABase64));
  return [...rutas, ...base64].filter(Boolean);
}

function limpiarFormulario() {
  $("productoId").value = "";
  $("categoria").value = "Forros";
  $("estado").value = "normal";
  $("nombre").value = "";
  $("titulo").value = "";
  $("descripcion").value = "";
  $("precio").value = "";
  $("precioMayor").value = "";
  $("imagenesUrls").value = "";
  $("imagenesFiles").value = "";
}

function badgeEstado(estado) {
  const e = String(estado || "normal").toLowerCase();
  if (e === "agotado") return "Agotado";
  if (e === "proximo") return "Próximamente";
  return "Normal";
}

function obtenerProductos() {
  const data = leerData();
  return data?.productos || [];
}

function renderTabla() {
  const tbody = $("tablaProductos");
  const productos = obtenerProductos();
  tbody.innerHTML = "";

  if (!productos.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay productos para editar.</td></tr>';
    return;
  }

  productos.forEach(producto => {
    const tr = document.createElement("tr");
    const mini = (producto.imagenes || []).slice(0, 4)
      .map(src => `<img src="${src}" alt="mini">`)
      .join("");

    tr.innerHTML = `
      <td>${producto.titulo || producto.nombre || ""}</td>
      <td>${producto.categoria || ""}</td>
      <td><span class="status ${producto.estado || "normal"}">${badgeEstado(producto.estado)}</span></td>
      <td>${producto.precio || ""}</td>
      <td><div class="mini">${mini}</div></td>
      <td>
        <button data-id="${producto.id}" data-action="edit">Editar</button>
        <button data-id="${producto.id}" data-action="delete">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function cargarEnFormulario(producto) {
  $("productoId").value = producto.id;
  $("categoria").value = producto.categoria || "Forros";
  $("estado").value = producto.estado || "normal";
  $("nombre").value = producto.nombre || "";
  $("titulo").value = producto.titulo || producto.nombre || "";
  $("descripcion").value = producto.descripcion || "";
  $("precio").value = producto.precio || "";
  $("precioMayor").value = producto.precioMayor || "";
  $("imagenesUrls").value = (producto.imagenes || []).join("\n");
  $("imagenesFiles").value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function manejarAccionesTabla(e) {
  const target = e.target;
  const id = target?.dataset?.id;
  const action = target?.dataset?.action;
  if (!id || !action) return;

  const productos = obtenerProductos();
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  if (action === "edit") {
    cargarEnFormulario(producto);
    return;
  }

  if (action === "delete") {
    const restante = productos.filter(p => p.id !== id);
    guardarData(restante);
    renderTabla();
    mostrarMensaje("Producto eliminado del catálogo.");
  }
}

async function manejarSubmit(e) {
  e.preventDefault();

  const id = $("productoId").value || `p-${Date.now()}`;
  const nombre = $("nombre").value.trim();
  const titulo = $("titulo").value.trim() || nombre;
  if (!nombre) {
    mostrarMensaje("El nombre interno es obligatorio.", true);
    return;
  }

  let imagenes = [];
  try {
    imagenes = await obtenerImagenesFormulario();
  } catch {
    mostrarMensaje("No se pudieron leer las imágenes seleccionadas.", true);
    return;
  }

  if (!imagenes.length) {
    mostrarMensaje("Debes agregar al menos una imagen.", true);
    return;
  }

  const producto = {
    id,
    categoria: $("categoria").value,
    estado: $("estado").value,
    nombre,
    titulo,
    descripcion: $("descripcion").value.trim(),
    precio: $("precio").value.trim(),
    precioMayor: $("precioMayor").value.trim(),
    promo: false,
    new: false,
    imagenes
  };

  const productos = obtenerProductos();
  const idx = productos.findIndex(p => p.id === id);

  if (idx >= 0) {
    productos[idx] = { ...productos[idx], ...producto };
  } else {
    productos.push(producto);
  }

  guardarData(productos);
  renderTabla();
  limpiarFormulario();
  mostrarMensaje("Cambios guardados. Actualiza index.html para verlos.");
}

function exportarRespaldo() {
  const data = leerData() || { version: 1, productos: [] };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "catalogo-admin-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function restaurarCatalogoBase() {
  const snapshot = leerSnapshot();
  if (!snapshot || !snapshot.productos?.length) {
    mostrarMensaje("No hay snapshot base. Abre index.html primero y vuelve a intentar.", true);
    return;
  }
  guardarData(snapshot.productos);
  renderTabla();
  limpiarFormulario();
  mostrarMensaje("Catálogo restaurado al estado base.");
}

function autenticar() {
  const pass = $("passwordInput").value;
  if (pass !== ADMIN_PASSWORD) {
    $("authError").textContent = "Contraseña incorrecta.";
    return;
  }

  sessionStorage.setItem(ADMIN_AUTH_KEY, "1");
  $("auth").style.display = "none";
  $("app").style.display = "block";

  asegurarDataInicial();
  renderTabla();
}

function iniciarApp() {
  const ok = sessionStorage.getItem(ADMIN_AUTH_KEY) === "1";
  if (ok) {
    $("auth").style.display = "none";
    $("app").style.display = "block";
    asegurarDataInicial();
    renderTabla();
  }

  $("loginBtn").addEventListener("click", autenticar);
  $("passwordInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      autenticar();
    }
  });

  $("productoForm").addEventListener("submit", manejarSubmit);
  $("tablaProductos").addEventListener("click", manejarAccionesTabla);
  $("nuevoProducto").addEventListener("click", limpiarFormulario);
  $("limpiarTodo").addEventListener("click", () => {
    if (!confirm("Esto restaurará todo el catálogo base. ¿Deseas continuar?")) return;
    restaurarCatalogoBase();
  });
  $("exportar").addEventListener("click", exportarRespaldo);
}

document.addEventListener("DOMContentLoaded", iniciarApp);
