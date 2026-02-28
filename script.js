// 1. Lista de vendedores
const VENDEDORES = [
    { nombre: "Christian", numero: "6977-8350" },
    { nombre: "Yoli", numero: "6168-3538" },
    { nombre: "Angel", numero: "6260-6548" },
    { nombre: "Mayerlis", numero: "6236-4158" },
    { nombre: "Génesis", numero: "6171-3520" }
];

const DEFAULT_CONFIG = {
  vendedorFijo: null,
  numeroFijo: null
};

const PROFILE_CONFIG = {
  christian: {
    vendedorFijo: "Christian",
    numeroFijo: "6977-8350"
  },
  yoli: {
    vendedorFijo: "Yoli",
    numeroFijo: "6168-3538"
  },
  angel: {
    vendedorFijo: "Angel",
    numeroFijo: "6260-6548"
  },
  mayerlis: {
    vendedorFijo: "Mayerlis",
    numeroFijo: "6236-4158"
  },
  genesis: {
    vendedorFijo: "Génesis",
    numeroFijo: "6171-3520"
  }
};

function normalizarPerfil(valor) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerConfigURL() {
  const params = new URLSearchParams(window.location.search);
  const perfilRaw = params.get("perfil") || params.get("trabajador") || params.get("vendedor") || "";
  const perfil = normalizarPerfil(perfilRaw);

  if (!perfil) {
    return {};
  }

  return PROFILE_CONFIG[perfil] || {};
}

const APP_CONFIG = {
  ...DEFAULT_CONFIG,
  ...obtenerConfigURL(),
  ...(window.CATALOGO_CONFIG || {})
};

let categoriaBaseActual = "Todos";
let filtroSubcategoriaActual = null;

// 2. Variables de estado
let seleccion = JSON.parse(localStorage.getItem("seleccion")) || [];
let productoActual = null; // <--- ESTA ES LA QUE FALTABA
let tiempoRestante = 7;
let intervaloTimer = null;
let mostrarPrecioMayor = false;
let toquesLogoMayor = [];
let modoDescargaImagenes = false;
let imagenesDescarga = [];
const seleccionImagenesDescarga = new Set();
const PLACEHOLDER_BUSCADOR_NORMAL = "Buscar productos...";
const PLACEHOLDER_BUSCADOR_DESCARGA = "Buscar imágenes...";
const CATALOGO_ADMIN_KEY = "catalogoAdminDataV1";
const CATALOGO_SNAPSHOT_KEY = "catalogoSnapshotDataV1";
const CLICKS_ACTIVACION_MAYOR = 7;
const VENTANA_ACTIVACION_MAYOR_MS = 5000;

/* ================= FUNCIÓN GLOBAL: CERRAR MENÚ ================= */
function cerrarMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuToggle = document.getElementById("menuToggle");
  
  if (sideMenu) sideMenu.classList.remove("active");
  if (menuOverlay) menuOverlay.classList.remove("active");
  document.body.style.overflow = "";
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
}

/* ================= INICIALIZAR ================= */
document.addEventListener("DOMContentLoaded", () => {
  aplicarConfiguracionUI();
  aplicarEdicionCatalogoAdministrado();
  restaurarSeleccion();
  actualizarContador();
  actualizarBotonWA();
  cerrarModal(); 
  
  // Configurar event listeners para reemplazar inline handlers
  configurarEventListeners();
  
  // Iniciar carruseles en las cartas de productos
  iniciarCarruelesCartas();
  
  // Iniciar alternancia de eslogan
  iniciarAlternanciaEslogan();
  iniciarModoMayoristaDesdeLogo();
  
  // Aplicar filtrado de agotados al cargar la página
  filtrarCategoria("Todos", null);
  
  // Inicializar productos promocionales (mostrar precio)
  inicializarProductosPromocionales();

  guardarSnapshotCatalogo();
});

function leerCatalogoAdminData() {
  try {
    const raw = localStorage.getItem(CATALOGO_ADMIN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.productos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function construirCardDesdeAdmin(producto) {
  const nombre = (producto.nombre || "Producto").trim();
  const titulo = (producto.titulo || nombre).trim();
  const descripcion = (producto.descripcion || "").trim();
  const precio = (producto.precio || "").trim();
  const precioMayor = (producto.precioMayor || "").trim();
  const estado = (producto.estado || "normal").toLowerCase();
  const esPromo = Boolean(producto.promo);
  const esNuevo = Boolean(producto.new);
  const imagenes = Array.isArray(producto.imagenes)
    ? producto.imagenes.map(v => String(v || "").trim()).filter(Boolean)
    : [];

  if (!nombre || !imagenes.length) return null;

  const clases = ["card"];
  if (estado === "proximo") clases.push("proximo");
  if (estado === "agotado") clases.push("agotado");
  if (esPromo) clases.push("promo");
  if (esNuevo) clases.push("new");

  const article = document.createElement("article");
  article.className = clases.join(" ");
  article.dataset.nombre = nombre;
  article.dataset.descripcion = descripcion;
  article.dataset.precio = precio;
  article.dataset.images = imagenes.join(",");
  article.dataset.adminId = String(producto.id || "");

  if (precioMayor) {
    article.dataset.precioMayor = precioMayor;
  }

  const nombreSeguro = escapeHtml(nombre);
  const tituloSeguro = escapeHtml(titulo);
  article.innerHTML = `
    <img src="${escapeHtml(imagenes[0])}" alt="${nombreSeguro}" loading="lazy">
    <div class="card-info">
      <h3>${tituloSeguro}</h3>
      <button onclick="toggleProducto(this)">Consultar</button>
    </div>
  `;

  return article;
}

function aplicarEdicionCatalogoAdministrado() {
  const data = leerCatalogoAdminData();
  if (!data || !Array.isArray(data.productos)) return;

  document.querySelectorAll(".categoria .grid").forEach(grid => {
    grid.innerHTML = "";
  });

  data.productos.forEach(producto => {
    const categoria = (producto.categoria || "").trim();
    if (!categoria) return;

    const grid = document.querySelector(`.categoria[data-categoria="${categoria}"] .grid`);
    if (!grid) return;

    const card = construirCardDesdeAdmin(producto);
    if (!card) return;

    grid.appendChild(card);
  });
}

function extraerProductoDeCard(card, categoria, idx) {
  const nombre = (card.dataset.nombre || "Producto").trim();
  const titulo = (card.querySelector(".card-info h3")?.textContent || nombre).trim();
  const descripcion = (card.dataset.descripcion || "").trim();
  const precio = (card.dataset.precio || "").trim();
  const precioMayor = (card.dataset.precioMayor || "").trim();
  const estado = card.classList.contains("agotado") ? "agotado" : (card.classList.contains("proximo") || card.classList.contains("proxima")) ? "proximo" : "normal";
  const imagenes = (card.dataset.images || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  return {
    id: card.dataset.adminId || `${categoria}-${idx + 1}-${Date.now()}`,
    categoria,
    estado,
    nombre,
    titulo,
    descripcion,
    precio,
    precioMayor,
    promo: card.classList.contains("promo"),
    new: card.classList.contains("new"),
    imagenes
  };
}

function guardarSnapshotCatalogo() {
  const productos = [];

  document.querySelectorAll(".categoria").forEach(sec => {
    const categoria = sec.dataset.categoria || "";
    if (!categoria) return;

    const cards = sec.querySelectorAll(".grid .card");
    cards.forEach((card, idx) => {
      const producto = extraerProductoDeCard(card, categoria, idx);
      if (producto.imagenes.length) {
        productos.push(producto);
      }
    });
  });

  const payload = {
    version: 1,
    generadoEn: new Date().toISOString(),
    productos
  };

  localStorage.setItem(CATALOGO_SNAPSHOT_KEY, JSON.stringify(payload));
}

function aplicarConfiguracionUI() {
  if (!APP_CONFIG.numeroFijo && !APP_CONFIG.vendedorFijo) return;

  const enlacesWhatsApp = document.querySelectorAll('a[href*="wa.me/"]');
  enlacesWhatsApp.forEach(link => {
    if (APP_CONFIG.numeroFijo) {
      link.href = `https://wa.me/507${APP_CONFIG.numeroFijo.replace(/\D/g, "")}`;
    }
    if (APP_CONFIG.vendedorFijo) {
      link.setAttribute("aria-label", `WhatsApp ${APP_CONFIG.vendedorFijo}`);
    }
  });
}

function iniciarModoMayoristaDesdeLogo() {
  const logo = document.querySelector(".header-brand .logo-img");
  if (!logo) return;

  logo.style.cursor = "pointer";

  logo.addEventListener("click", (e) => {
    if (typeof e.button === "number" && e.button !== 0) return;
    registrarToqueLogoMayor();
  });
}

function registrarToqueLogoMayor() {
  const ahora = Date.now();
  toquesLogoMayor.push(ahora);
  toquesLogoMayor = toquesLogoMayor.filter(ts => (ahora - ts) <= VENTANA_ACTIVACION_MAYOR_MS);

  if (toquesLogoMayor.length >= CLICKS_ACTIVACION_MAYOR) {
    toquesLogoMayor = [];
    alternarModoMayorista();
  }
}

function alternarModoMayorista() {
  mostrarPrecioMayor = !mostrarPrecioMayor;
  document.body.classList.toggle("modo-mayorista", mostrarPrecioMayor);

  const logo = document.querySelector(".header-brand .logo-img");
  if (logo) {
    logo.classList.toggle("logo-mayorista-activo", mostrarPrecioMayor);
  }

  if (window.cardModalActual) {
    actualizarPreciosModal(window.cardModalActual);
  }
}

function actualizarPreciosModal(card) {
  const precioElem = document.getElementById("modalPrecio");
  const precioMayorElem = document.getElementById("modalPrecioMayor");
  if (!precioElem || !precioMayorElem || !card) return;

  const precioDetalle = (card.dataset.precio || card.dataset.price || "").trim();
  const precioMayor = (card.dataset.precioMayor || card.dataset.precioMayoreo || "").trim();

  if (mostrarPrecioMayor) {
    precioElem.style.display = "none";
    precioMayorElem.style.display = "block";
    precioMayorElem.textContent = `Precio al mayor: ${precioMayor}`;
    return;
  }

  precioMayorElem.style.display = "none";
  if (precioDetalle) {
    precioElem.style.display = "block";
    precioElem.textContent = precioDetalle;
  } else {
    precioElem.style.display = "none";
    precioElem.textContent = "";
  }
}

/* ================= ALTERNANCIA DE ESLOGAN ================= */
function iniciarAlternanciaEslogan() {
  const sp1 = document.querySelector('.header-tagline.SP1');
  const sp2 = document.querySelector('.header-tagline.SP2');
  
  if (!sp1 || !sp2) return;
  
  let mostrandoSP1 = true;
  
  setInterval(() => {
    if (mostrandoSP1) {
      // Fade out SP1, fade in SP2
      sp1.classList.add('fade-out');
      sp2.classList.add('fade-in');
    } else {
      // Fade out SP2, fade in SP1
      sp1.classList.remove('fade-out');
      sp2.classList.remove('fade-in');
    }
    mostrandoSP1 = !mostrandoSP1;
  }, 8000);
}

/* ================= INICIALIZAR PRODUCTOS PROMOCIONALES Y NOVEDADES ================= */
function inicializarProductosPromocionales() {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    const cardInfo = card.querySelector('.card-info');
    const h3 = card.querySelector('.card-info h3');
    
    if (!cardInfo) return;
    
    // Remover elemento anterior si existe
    cardInfo.querySelectorAll('.card-label').forEach(label => label.remove());

    const esPromo = card.classList.contains('promo');
    const esNuevo = card.classList.contains('new');

    if (!esPromo && !esNuevo) return;

    const labelElement = document.createElement('p');

    if (esPromo && esNuevo) {
      labelElement.className = 'card-label card-label-combo';
      labelElement.textContent = 'Oferta + Nuevo';
    } else if (esPromo) {
      labelElement.className = 'card-label card-label-promo';
      labelElement.textContent = 'Oferta';
    } else {
      labelElement.className = 'card-label card-label-new';
      labelElement.textContent = 'Nuevo';
    }

    if (h3) {
      cardInfo.insertBefore(labelElement, h3);
    } else {
      cardInfo.prepend(labelElement);
    }
  });
}

/* ================= CONFIGURAR EVENT LISTENERS ================= */
function configurarEventListeners() {
  // Buscador
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", filtrar);
  }

  // Botones de categoría
  document.querySelectorAll("#catNav button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const category = e.target.dataset.category;
      if (category) {
        filtrarCategoria(category, e.target);
      }
    });
  });
  
  // Toggle de columnas del grid
  const toggleGridBtn = document.getElementById("toggleGridColumns");
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const grids = document.querySelectorAll(".grid");
      const toggleText = document.getElementById("gridToggleText");
      
      // Verificar el estado del primer grid
      const isThreeColumns = grids[0]?.style.gridTemplateColumns === "repeat(3, 1fr)";
      
      if (isThreeColumns) {
        // Volver a 2 columnas
        grids.forEach(grid => {
          grid.style.gridTemplateColumns = "";
        });
        toggleText.textContent = "Ver 3 columnas";
        localStorage.setItem("gridColumns", "2");
      } else {
        // Cambiar a 3 columnas
        grids.forEach(grid => {
          grid.style.gridTemplateColumns = "repeat(3, 1fr)";
        });
        toggleText.textContent = "Ver 2 columnas";
        localStorage.setItem("gridColumns", "3");
      }
    });
  }
  
  // Restaurar estado del grid
  const savedGridColumns = localStorage.getItem("gridColumns");
  if (savedGridColumns === "3") {
    const grids = document.querySelectorAll(".grid");
    const toggleText = document.getElementById("gridToggleText");
    grids.forEach(grid => {
      grid.style.gridTemplateColumns = "repeat(3, 1fr)";
    });
    if (toggleText) toggleText.textContent = "Ver 2 columnas";
  }
  
  // Botón Ver Ubicación
  const openLocationBtn = document.getElementById("openLocationVideo");
  if (openLocationBtn) {
    openLocationBtn.addEventListener("click", (e) => {
      e.preventDefault();
      abrirModalVideo();
    });
  }

  const openImageDownloadSectionBtn = document.getElementById("openImageDownloadSection");
  if (openImageDownloadSectionBtn) {
    openImageDownloadSectionBtn.addEventListener("click", (e) => {
      e.preventDefault();
      activarModoDescargaImagenes();
      cerrarMenu();
    });
  }

  const descargarImagenesBtn = document.getElementById("descargarImagenesSeleccionadas");
  if (descargarImagenesBtn) {
    descargarImagenesBtn.addEventListener("click", descargarImagenesSeleccionadas);
  }
  
  // Menú hamburguesa
  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const menuOverlay = document.getElementById("menuOverlay");
  const sideMenu = document.getElementById("sideMenu");
  
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sideMenu.classList.add("active");
      menuOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
      menuToggle.setAttribute("aria-expanded", "true");
    });
  }
  
  if (menuClose) {
    menuClose.addEventListener("click", cerrarMenu);
  }
  
  if (menuOverlay) {
    menuOverlay.addEventListener("click", cerrarMenu);
  }

  // Cerrar modal de vendedores al tocar fuera del cuadro
  const modalVendedor = document.getElementById("modalVendedor");
  if (modalVendedor) {
    modalVendedor.addEventListener("click", (e) => {
      if (e.target === modalVendedor) {
        cancelarModalVendedor();
      }
    });
  }
  
  // Enlaces del menú lateral
  document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const category = e.currentTarget.dataset.category;
      if (category) {
        e.preventDefault();

        if (modoDescargaImagenes) {
          desactivarModoDescargaImagenes();
        }
        
        // Actualizar estado activo
        document.querySelectorAll(".menu-link").forEach(l => l.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        // Filtrar por categoría
        filtrarCategoria(category, null);
        
        // Cerrar menú
        cerrarMenu();
      }
    });
  });

  // Imágenes de productos para abrir modal
  document.querySelectorAll(".card img").forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", () => abrirModal(img));
  });

  // Botón flotante con teclado
  const floatBtn = document.querySelector(".float-wa");
  if (floatBtn) {
    floatBtn.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enviarWA();
      }
    });
  }

  // Abrir collage al tocar/clic en la imagen del modal de producto
  const modalImg = document.getElementById("modalImg");
  if (modalImg) {
    modalImg.style.cursor = "zoom-in";
    modalImg.addEventListener("click", abrirModalCollage);
    modalImg.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrirModalCollage();
      }
    });
  }

  const modalCollage = document.getElementById("modalCollage");
  if (modalCollage) {
    modalCollage.addEventListener("click", (e) => {
      if (e.target === modalCollage) {
        cerrarModalCollage();
      }
    });
  }
}

/* ================= CARRUSEL EN CARTAS ================= */
function iniciarCarruelesCartas() {
  document.querySelectorAll(".card").forEach((card, index) => {
    const imgs = (card.dataset.images || '').split(',').map(s => s.trim()).filter(Boolean);
    
    if (imgs.length > 1) {
      // Iniciar en índice aleatorio
      const indicePrincipal = Math.floor(Math.random() * imgs.length);
      
      // Guardar datos en el card
      card.dataset.images = imgs.join(',');
      card.dataset.imgIndex = indicePrincipal;
      
      // Actualizar imagen inicial
      const img = card.querySelector('img');
      if (img) {
        img.src = imgs[indicePrincipal];
      }
      
      // Iniciar rotación cada 5 segundos
      setInterval(() => {
        const imgActual = card.querySelector('img');
        if (imgActual) {
          let nuevoIndex = parseInt(card.dataset.imgIndex) || 0;
          nuevoIndex = (nuevoIndex + 1) % imgs.length;
          card.dataset.imgIndex = nuevoIndex;
          imgActual.src = imgs[nuevoIndex];
        }
      }, 5000);
    }
  });
}

/* ================= ABRIR MODAL ================= */
function abrirModal(img){
  try {
    const card = img.closest(".card");
    if (!card) return;
    window.cardModalActual = card;
    
    const nombre = card.dataset.nombre || "Producto";
    const descripcion = card.dataset.descripcion || "Producto de alta calidad.";
    const agotado = card.classList.contains("agotado");
    productoActual = nombre;

    document.getElementById("modalImg").src = img.src;
    document.getElementById("modalImg").alt = nombre;
    
    // Usar textContent en lugar de innerHTML para seguridad
    document.getElementById("modalNombre").textContent = nombre;
    document.getElementById("modalDesc").textContent = descripcion;
    actualizarEtiquetaFraganciaModal(nombre);
    
    actualizarPreciosModal(card);

    // --- Carousel automático: leer imágenes y empezar interval ---
    // Limpiar interval previo si existe
    if(window.modalInterval){
      clearInterval(window.modalInterval);
      window.modalInterval = null;
    }

    // Obtener imágenes desde data-images; si no existe, usar la imagen del card como fallback
    let imgs = (card.dataset.images || '').split(',').map(s=>s.trim()).filter(Boolean);
    if(!imgs.length){
      const cardImg = card.querySelector('img');
      if(cardImg && cardImg.src){
        imgs = [cardImg.src];
      }
    }

    if(imgs.length){
      window.modalImages = imgs;
      window.modalIndex = 0;

      const srcActual = img.getAttribute("src") || img.src || "";
      const indexDesdeCard = window.modalImages.findIndex(ruta => {
        if (!ruta || !srcActual) return false;
        return ruta === srcActual || srcActual.includes(ruta);
      });
      if (indexDesdeCard >= 0) {
        window.modalIndex = indexDesdeCard;
      }

      // mostrar la imagen actual según el índice calculado
      mostrarImagenModal(window.modalIndex);
      // iniciar rotación automática solo si hay más de una imagen
      if(window.modalImages.length > 1){
        window.modalInterval = setInterval(()=>{
          window.modalIndex = (window.modalIndex + 1) % window.modalImages.length;
          mostrarImagenModal(window.modalIndex);
        }, 2500);
      } else {
        // asegurar que no haya interval activo
        if(window.modalInterval){
          clearInterval(window.modalInterval);
          window.modalInterval = null;
        }
      }
    } else {
      window.modalImages = null;
      window.modalIndex = null;
    }

    const modalBtn = document.getElementById("modalBtn");
    
    if(agotado){
      modalBtn.disabled = true;
      modalBtn.style.backgroundColor = "#a0a0a0";
      modalBtn.textContent = "Producto Agotado";
    } else if(seleccion.includes(nombre)){
      modalBtn.disabled = false;
      modalBtn.classList.add("selected");
      modalBtn.style.backgroundColor = "var(--wa)";
      modalBtn.textContent = "Eliminar de consulta";
    } else {
      modalBtn.disabled = false;
      modalBtn.classList.remove("selected");
      modalBtn.style.backgroundColor = "var(--primary)";
      modalBtn.textContent = "Agregar a consulta";
    }

    document.getElementById("modalImagen").classList.add("activo");
  } catch (error) {
    console.error("Error al abrir modal:", error);
  }
}

function actualizarEtiquetaFraganciaModal(nombreProducto) {
  const etiqueta = document.getElementById("modalEtiquetaFragancia");
  const etiquetaSecundaria = document.getElementById("modalEtiquetaFraganciaSecundaria");
  if (!etiqueta || !etiquetaSecundaria) return;

  const nombre = (nombreProducto || "").toLowerCase();
  etiqueta.classList.remove("activa", "pos-left", "pos-right");
  etiqueta.textContent = "";
  etiquetaSecundaria.classList.remove("activa", "pos-left", "pos-right");
  etiquetaSecundaria.textContent = "";

  if (nombre.includes("combo irresistible")) {
    etiqueta.textContent = "Crema";
    etiqueta.classList.add("activa", "pos-left");
    etiquetaSecundaria.textContent = "Splash";
    etiquetaSecundaria.classList.add("activa", "pos-right");
    return;
  }

  if (nombre.includes("splash victoria's secret")) {
    etiqueta.textContent = "Splash";
    etiqueta.classList.add("activa", "pos-right");
    return;
  }

  if (nombre.includes("cremas victoria's secret")) {
    etiqueta.textContent = "Crema";
    etiqueta.classList.add("activa", "pos-left");
  }
}

/* ================= CERRAR MODAL ================= */
function cerrarModal(){
  document.getElementById("modalImagen").classList.remove("activo");
  cerrarModalCollage();
  actualizarEtiquetaFraganciaModal("");
  productoActual = null;
  window.cardModalActual = null;
  // limpiar rotación automática si existe
  if(window.modalInterval){
    clearInterval(window.modalInterval);
    window.modalInterval = null;
  }
}

/* Cerrar modal al hacer clic fuera de él */
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modalImagen");
  if(e.target === modal){
    cerrarModal();
  }
});

/* ================= FUNCIONES MODAL VIDEO UBICACIÓN ================= */
const VIDEOS_UBICACION = {
  "5mayo": "videos/ubicacion.mp4",
  "mcdonalds": "videos/ubicacion2.mp4"
};

function abrirModalVideo(){
  const modalVideo = document.getElementById("modalVideo");
  const video = document.getElementById("videoUbicacion");
  const source = document.getElementById("videoUbicacionSource");
  if(modalVideo){
    modalVideo.style.display = "flex";
    cerrarMenu(); // Cerrar menú hamburguesa si está abierto
  }

  if (video && source) {
    source.src = "";
    video.load();
  }

  actualizarBotonesRutaVideo(null);
}

function seleccionarVideoUbicacion(ruta) {
  const src = VIDEOS_UBICACION[ruta];
  const video = document.getElementById("videoUbicacion");
  const source = document.getElementById("videoUbicacionSource");
  if (!src || !video || !source) return;

  source.src = src;
  video.load();
  actualizarBotonesRutaVideo(ruta);

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function actualizarBotonesRutaVideo(rutaActiva) {
  const btnRuta5Mayo = document.getElementById("btnRuta5Mayo");
  const btnRutaMcVendela = document.getElementById("btnRutaMcVendela");

  if (btnRuta5Mayo) {
    btnRuta5Mayo.classList.toggle("selected", rutaActiva === "5mayo");
  }

  if (btnRutaMcVendela) {
    btnRutaMcVendela.classList.toggle("selected", rutaActiva === "mcdonalds");
  }
}

function cerrarModalVideo(){
  const modalVideo = document.getElementById("modalVideo");
  const video = document.getElementById("videoUbicacion");
  const source = document.getElementById("videoUbicacionSource");
  if(modalVideo){
    modalVideo.style.display = "none";
  }
  if(video){
    video.pause();
    video.currentTime = 0;
  }
  if (source) {
    source.src = "";
  }
  if (video) {
    video.load();
  }
  actualizarBotonesRutaVideo(null);
}

// Cerrar modal de video al hacer clic fuera
document.addEventListener("click", (e) => {
  const modVid = document.getElementById("modalVideo");
  if(e.target === modVid){
    cerrarModalVideo();
  }
});

/* ================= AGREGAR DESDE MODAL ================= */
function agregarDelModal(){
  if(!productoActual) return;
  
  // Obtener la card actual del producto
  const cardActual = document.querySelector(`.card[data-nombre="${productoActual}"]`);
  if(cardActual && cardActual.classList.contains("agotado")) return;
  
  const esAgregando = !seleccion.includes(productoActual);
  
  if(seleccion.includes(productoActual)){
    seleccion = seleccion.filter(p => p !== productoActual);
  } else {
    seleccion.push(productoActual);
  }

  guardarSeleccion();
  actualizarContador(true);
  actualizarBotonWA();
  
  // Actualizar estado del botón en el modal y en la card
  const modalBtn = document.getElementById("modalBtn");
  if(seleccion.includes(productoActual)){
    modalBtn.classList.add("selected");
    modalBtn.textContent = "Seleccionado";
    if(cardActual) cardActual.classList.add("seleccionado");
  } else {
    modalBtn.classList.remove("selected");
    modalBtn.textContent = "Agregar a consulta";
    if(cardActual) cardActual.classList.remove("seleccionado");
  }

  // Actualizar estado en todas las cards
  restaurarSeleccion();
  
  // Cerrar modal al agregar o eliminar
  setTimeout(() => cerrarModal(), 300);
}

/* ================= SELECCIONAR PRODUCTO ================= */
function toggleProducto(btn){
  const card = btn.closest(".card");
  const nombre = card.dataset.nombre;
  const agotado = card.classList.contains("agotado");

  if(agotado) return; // No permite agregar si está agotado

  if(seleccion.includes(nombre)){
    seleccion = seleccion.filter(p => p !== nombre);
    card.classList.remove("seleccionado");
    btn.classList.remove("selected");
    btn.textContent = "Consultar";
  } else {
    seleccion.push(nombre);
    card.classList.add("seleccionado");
    btn.classList.add("selected");
    btn.textContent = "Seleccionado";
  }

  guardarSeleccion();
  actualizarContador(true);
  actualizarBotonWA();
}

/* ================= GUARDAR SELECCIÓN ================= */
function guardarSeleccion(){
  localStorage.setItem("seleccion", JSON.stringify(seleccion));
}

/* ================= RESTAURAR SELECCIÓN ================= */
function restaurarSeleccion(){
  document.querySelectorAll(".card").forEach(card => {
    const nombre = card.dataset.nombre;
    const btn = card.querySelector("button");
    const agotado = card.classList.contains("agotado");

    if(agotado){
      btn.disabled = true;
      btn.classList.remove("selected");
      card.classList.remove("seleccionado");
      btn.textContent = "Agotado";
      btn.style.backgroundColor = "#a0a0a0";
    } else if(seleccion.includes(nombre)){
      btn.disabled = false;
      btn.classList.add("selected");
      card.classList.add("seleccionado");
      btn.textContent = "Seleccionado";
      btn.style.backgroundColor = "";
    } else {
      btn.disabled = false;
      btn.classList.remove("selected");
      card.classList.remove("seleccionado");
      btn.textContent = "Consultar";
      btn.style.backgroundColor = "";
    }
  });
}

/* ================= CONTADOR ================= */
function actualizarContador(animar=false){
  const count = document.getElementById("count");
  count.textContent = seleccion.length;

  if(animar){
    count.style.transform = "scale(1.3)";
    setTimeout(()=> count.style.transform = "scale(1)", 200);
  }
}

/* ================= BOTÓN WHATSAPP ================= */
function actualizarBotonWA(){
  const btn = document.querySelector(".float-wa");

  if(seleccion.length === 0){
    btn.style.backgroundColor = "gray";
    btn.style.pointerEvents = "none";
  } else {
    btn.style.backgroundColor = "var(--wa";
    btn.style.pointerEvents = "auto";
  }
}

function enviarWA() {
    if (!seleccion.length) return;

    if (APP_CONFIG.numeroFijo) {
      finalizarYEnviar(APP_CONFIG.numeroFijo);
      return;
    }
    
    // Mostrar el modal de vendedores
    const modalVen = document.getElementById("modalVendedor");
    const listaVen = document.getElementById("listaVendedores");
    const timerDisplay = document.getElementById("timer");
    
    listaVen.innerHTML = ""; // Limpiar
    modalVen.style.display = "flex";
    tiempoRestante = 7;
    timerDisplay.textContent = tiempoRestante;

    // Crear botones de vendedores
    VENDEDORES.forEach(v => {
        const btn = document.createElement("button");
        btn.className = "btn-vendedor";
        btn.textContent = v.nombre;
        btn.onclick = () => finalizarYEnviar(v.numero);
        listaVen.appendChild(btn);
    });

    // Iniciar cuenta regresiva
    intervaloTimer = setInterval(() => {
        tiempoRestante--;
        timerDisplay.textContent = tiempoRestante;
        if (tiempoRestante <= 0) {
            clearInterval(intervaloTimer);
            // Selección aleatoria si se acaba el tiempo
            const azar = VENDEDORES[Math.floor(Math.random() * VENDEDORES.length)];
            finalizarYEnviar(azar.numero);
        }
    }, 1000);
}

function finalizarYEnviar(numeroDestino) {
    clearInterval(intervaloTimer);
    const modal = document.getElementById("modalVendedor");
    if (modal) {
      modal.style.display = "none";
    }

  const catalogoUrl = window.location.href;
  const listaProductos = seleccion.map((prod, i) => `${i + 1}. ${prod}`).join("\n");

  const msg = [
    catalogoUrl,
    "",
    "Hola, equipo de Home Style.",
    "",
    `Quisiera cotizar ${seleccion.length} producto(s):`,
    listaProductos,
    "",
    "Gracias. Quedo atento(a)."
  ].join("\n");

    // Eliminar guion y agregar 507 para la URL de WhatsApp
    const numeroLimpio = numeroDestino.replace('-', '');
    window.open(`https://wa.me/507${numeroLimpio}?text=${encodeURIComponent(msg)}`, "_blank");
}

  function cancelarModalVendedor() {
    clearInterval(intervaloTimer);
    const modalVen = document.getElementById("modalVendedor");
    if (modalVen) modalVen.style.display = "none";
  }

/* ================= BUSCADOR ================= */
/* ================= DISTANCIA DE LEVENSHTEIN (FUZZY SEARCH) ================= */
function distanciaLevenshtein(a, b) {
  const matA = a.split('');
  const matB = b.split('');
  const matriz = [];
  
  for (let i = 0; i <= matB.length; i++) {
    matriz[i] = [i];
  }
  
  for (let j = 0; j <= matA.length; j++) {
    matriz[0][j] = j;
  }
  
  for (let i = 1; i <= matB.length; i++) {
    for (let j = 1; j <= matA.length; j++) {
      const costo = matA[j - 1] === matB[i - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i][j - 1] + 1,
        matriz[i - 1][j] + 1,
        matriz[i - 1][j - 1] + costo
      );
    }
  }
  
  return matriz[matB.length][matA.length];
}

/* ================= BÚSQUEDA FUZZY ================= */
function coincideFuzzy(texto, consulta, tolerancia = 2) {
  // Si la consulta está vacía, todo coincide
  if (!consulta) return true;
  
  // 1. Búsqueda exacta (prioridad máxima)
  if (texto.includes(consulta)) return true;
  
  // 2. Búsqueda por palabras individuales
  const palabrasTexto = texto.split(/\s+/);
  const palabrasConsulta = consulta.split(/\s+/);
  
  for (const pConsulta of palabrasConsulta) {
    let encontrada = false;
    
    for (const pTexto of palabrasTexto) {
      const distancia = distanciaLevenshtein(pConsulta, pTexto);
      
      // Permitir si la distancia es menor o igual a la tolerancia
      if (distancia <= tolerancia) {
        encontrada = true;
        break;
      }
    }
    
    if (!encontrada) {
      return false;
    }
  }
  
  return true;
}

function normalizarTextoBusqueda(valor) {
  return (valor || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function recolectarImagenesParaDescarga() {
  const listaImagenes = [];
  let contadorImagen = 0;

  document.querySelectorAll(".categoria").forEach(sec => {
    const categoria = sec.dataset.categoria || "Todos";

    sec.querySelectorAll(".card").forEach(card => {
      const nombreProducto = card.dataset.nombre || "Producto";
      const lista = (card.dataset.images || "")
        .split(",")
        .map(img => img.trim())
        .filter(Boolean);

      if (!lista.length) {
        const imgCard = card.querySelector("img");
        if (imgCard?.getAttribute("src")) {
          lista.push(imgCard.getAttribute("src").trim());
        }
      }

      lista.forEach(ruta => {
        if (!ruta || ruta.includes("img/categoria/00/0.jpeg")) return;

        contadorImagen += 1;
        listaImagenes.push({
          id: `img-descarga-${contadorImagen}`,
          src: ruta,
          categoria,
          nombre: nombreProducto
        });
      });
    });
  });

  imagenesDescarga = listaImagenes;
}

function actualizarEstadoDescargaImagenes() {
  const estado = document.getElementById("descargaImagenesEstado");
  if (!estado) return;

  const cantidad = seleccionImagenesDescarga.size;
  estado.textContent = `${cantidad} imágenes seleccionadas`;
}

function crearNombreDescarga(src, index) {
  const limpio = (src || "").split("?")[0];
  const partes = limpio.split("/");
  const archivo = partes[partes.length - 1] || `imagen-${index + 1}.jpeg`;
  const carpeta = partes.length >= 2 ? partes[partes.length - 2] : "catalogo";
  return `${carpeta}-${archivo}`;
}

function renderizarGaleriaDescarga() {
  if (!modoDescargaImagenes) return;

  const grid = document.getElementById("descargaImagenesGrid");
  if (!grid) return;

  const q = normalizarTextoBusqueda(document.getElementById("search")?.value || "");
  const categoriaObjetivo = categoriaBaseActual || "Todos";

  const lista = imagenesDescarga.filter(item => {
    if (categoriaObjetivo !== "Todos" && item.categoria !== categoriaObjetivo) {
      return false;
    }

    if (!q) return true;

    const texto = normalizarTextoBusqueda(`${item.nombre} ${item.categoria} ${item.src}`);
    return coincideFuzzy(texto, q);
  });

  grid.innerHTML = "";

  if (!lista.length) {
    const vacio = document.createElement("p");
    vacio.className = "descarga-imagenes-vacio";
    vacio.textContent = "No hay imágenes para mostrar con esos filtros.";
    grid.appendChild(vacio);
    actualizarEstadoDescargaImagenes();
    return;
  }

  lista.forEach(item => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "descarga-imagen-item";
    boton.setAttribute("aria-label", `Seleccionar imagen de ${item.nombre}`);

    if (seleccionImagenesDescarga.has(item.id)) {
      boton.classList.add("selected");
    }

    const imagen = document.createElement("img");
    imagen.src = item.src;
    imagen.alt = "Imagen de producto";
    imagen.loading = "lazy";

    const marca = document.createElement("span");
    marca.className = "descarga-imagen-check";
    marca.textContent = "✓";

    const nombre = document.createElement("span");
    nombre.className = "descarga-imagen-nombre";
    nombre.textContent = item.nombre;

    boton.appendChild(imagen);
    boton.appendChild(marca);
    boton.appendChild(nombre);

    boton.addEventListener("click", () => {
      if (seleccionImagenesDescarga.has(item.id)) {
        seleccionImagenesDescarga.delete(item.id);
        boton.classList.remove("selected");
      } else {
        seleccionImagenesDescarga.add(item.id);
        boton.classList.add("selected");
      }
      actualizarEstadoDescargaImagenes();
    });

    grid.appendChild(boton);
  });

  actualizarEstadoDescargaImagenes();
}

function activarModoDescargaImagenes() {
  if (!imagenesDescarga.length) {
    recolectarImagenesParaDescarga();
  }

  modoDescargaImagenes = true;
  categoriaBaseActual = "Todos";
  filtroSubcategoriaActual = null;

  const seccionDescarga = document.getElementById("seccionDescargaImagenes");
  const buscador = document.getElementById("search");
  const botonMenuDescarga = document.getElementById("openImageDownloadSection");
  const botonFlotante = document.querySelector(".float-wa");

  document.querySelectorAll("#catalogo .categoria").forEach(sec => {
    sec.style.display = "none";
  });
  if (seccionDescarga) seccionDescarga.style.display = "";
  if (botonFlotante) botonFlotante.style.display = "none";

  if (buscador) {
    buscador.value = "";
    buscador.placeholder = PLACEHOLDER_BUSCADOR_DESCARGA;
  }

  document.querySelectorAll("nav button").forEach(btn => {
    const esTodos = btn.dataset.category === "Todos";
    btn.classList.toggle("active", esTodos);
    btn.setAttribute("aria-pressed", esTodos ? "true" : "false");
  });

  document.querySelectorAll(".menu-link").forEach(link => link.classList.remove("active"));
  if (botonMenuDescarga) botonMenuDescarga.classList.add("active");

  renderizarGaleriaDescarga();
}

function desactivarModoDescargaImagenes() {
  if (!modoDescargaImagenes) return;

  modoDescargaImagenes = false;
  const seccionDescarga = document.getElementById("seccionDescargaImagenes");
  const buscador = document.getElementById("search");
  const botonFlotante = document.querySelector(".float-wa");
  const botonMenuDescarga = document.getElementById("openImageDownloadSection");

  document.querySelectorAll("#catalogo .categoria").forEach(sec => {
    sec.style.display = "";
  });
  if (seccionDescarga) seccionDescarga.style.display = "none";
  if (botonFlotante) botonFlotante.style.display = "";
  if (botonMenuDescarga) botonMenuDescarga.classList.remove("active");

  if (buscador) {
    buscador.value = "";
    buscador.placeholder = PLACEHOLDER_BUSCADOR_NORMAL;
  }
}

function descargarImagenesSeleccionadas() {
  if (!seleccionImagenesDescarga.size) {
    alert("Selecciona al menos una imagen para descargar.");
    return;
  }

  const seleccionadas = imagenesDescarga.filter(item => seleccionImagenesDescarga.has(item.id));

  seleccionadas.forEach((item, index) => {
    const enlace = document.createElement("a");
    enlace.href = item.src;
    enlace.download = crearNombreDescarga(item.src, index);
    document.body.appendChild(enlace);

    setTimeout(() => {
      enlace.click();
      enlace.remove();
    }, index * 120);
  });
}

function filtrar(){
  if (modoDescargaImagenes) {
    renderizarGaleriaDescarga();
    return;
  }

  const q = (document.getElementById("search").value || "").toLowerCase().trim();

  // Filtrar cards por nombre
  document.querySelectorAll(".card").forEach(card=>{
    try {
      const nombre = (card.dataset.nombre || "").toLowerCase();
      const visible = !q || coincideFuzzy(nombre, q);
      card.style.display = visible ? "" : "none";
    } catch (error) {
      console.error("Error en filtro de card:", error);
    }
  });

  // Ocultar categorías sin productos visibles
  document.querySelectorAll(".categoria").forEach(seccion=>{
    const tieneVisibles = Array.from(seccion.querySelectorAll(".card")).some(card => card.style.display !== "none");
    seccion.style.display = tieneVisibles ? "" : "none";
  });
}

/* ================= FILTRO POR CATEGORÍA ================= */
function filtrarCategoria(cat, btn){
  if (!cat) return; // Validación de seguridad

  const categoriasBase = new Set([
    "Todos", "Forros", "Comedor", "Sábanas", "Alfombras", "Electrónicos", "Almohadas", "Fragancias", "Frazadas", "Toallas", "Mochilas", "Carteras", "Baño", "Cortinas", "Accesorios", "Otros"
  ]);

  const filtrosSubcategoria = {
    "Promociones": card => card.classList.contains("promo"),
    "Novedades": card => card.classList.contains("new"),
    "Proximamente": card => card.classList.contains("proximo") || card.classList.contains("proxima"),
    "Agotados": card => card.classList.contains("agotado")
  };

  if (modoDescargaImagenes) {
    if (!categoriasBase.has(cat)) return;

    categoriaBaseActual = cat;

    document.querySelectorAll("nav button").forEach(b=>{
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });

    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    }

    renderizarGaleriaDescarga();
    const seccion = document.getElementById("seccionDescargaImagenes");
    if (seccion) {
      seccion.scrollIntoView({ behavior:"smooth", block:"start" });
    }
    return;
  }

  if (categoriasBase.has(cat)) {
    categoriaBaseActual = cat;
    filtroSubcategoriaActual = null;
  } else if (filtrosSubcategoria[cat]) {
    filtroSubcategoriaActual = cat;
  }
  
  document.getElementById("search").value = "";

  document.querySelectorAll("nav button").forEach(b=>{
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });
  
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
  }

  const tituloEspecial = document.getElementById("titulo-especial");
  if (tituloEspecial) tituloEspecial.remove();

  const filtroActivo = filtroSubcategoriaActual && filtrosSubcategoria[filtroSubcategoriaActual]
    ? filtrosSubcategoria[filtroSubcategoriaActual]
    : null;

  const baseEsTodos = categoriaBaseActual === "Todos";
  const mostrarAgotadosEnTodos = false;

  document.querySelectorAll(".categoria").forEach(sec => {
    const esCategoriaBase = baseEsTodos || sec.dataset.categoria === categoriaBaseActual;
    sec.style.display = esCategoriaBase ? "" : "none";
  });

  document.querySelectorAll(".category-title").forEach(title => {
    if (filtroActivo && (filtroSubcategoriaActual === "Promociones" || filtroSubcategoriaActual === "Novedades" || filtroSubcategoriaActual === "Proximamente")) {
      title.style.display = "none";
    } else {
      title.style.display = "";
    }
  });

  document.querySelectorAll(".card").forEach(card => {
    const sec = card.closest(".categoria");
    const dentroBase = sec && (baseEsTodos || sec.dataset.categoria === categoriaBaseActual);

    if (!dentroBase) {
      card.style.display = "none";
      return;
    }

    if (filtroActivo) {
      if (filtroSubcategoriaActual === "Agotados" && baseEsTodos) {
        card.style.display = "none";
      } else {
        card.style.display = filtroActivo(card) ? "" : "none";
      }
      return;
    }

    if (baseEsTodos && !mostrarAgotadosEnTodos && card.classList.contains("agotado")) {
      card.style.display = "none";
      return;
    }

    card.style.display = "";
  });

  if (filtroSubcategoriaActual === "Promociones") {
    mostrarTituloEspecial("promocion");
  } else if (filtroSubcategoriaActual === "Novedades") {
    mostrarTituloEspecial("novedad");
  } else if (filtroSubcategoriaActual === "Proximamente") {
    mostrarTituloEspecial("proximamente");
  }

  document.querySelectorAll(".categoria").forEach(sec => {
    const tieneVisibles = Array.from(sec.querySelectorAll(".card")).some(card => card.style.display !== "none");
    sec.style.display = tieneVisibles ? "" : "none";
  });

  const target = document.querySelector("#titulo-especial")
    || document.querySelector(`.categoria[data-categoria="${categoriaBaseActual}"]`)
    || document.querySelector(".categoria");

  if (target) {
    target.scrollIntoView({ behavior:"smooth", block:"start" });
  }
}

// Función auxiliar para mostrar título especial
function mostrarTituloEspecial(tipo) {
  // Remover anterior si existe
  const anterior = document.getElementById("titulo-especial");
  if (anterior) anterior.remove();
  
  const titulo = document.createElement("div");
  titulo.id = "titulo-especial";
  titulo.className = "category-title";
  
  if (tipo === "promocion") {
    titulo.textContent = "🎁 Promociones Especiales";
  } else if (tipo === "novedad") {
    titulo.textContent = "⚡ Novedades";
  } else if (tipo === "proximamente") {
    titulo.textContent = "🕒 Próximamente";
  }
  
  // Insertar después del nav o antes del primer grid
  const nav = document.querySelector("nav");
  if (nav) {
    nav.parentNode.insertBefore(titulo, nav.nextSibling);
  } else {
    document.body.insertBefore(titulo, document.querySelector(".grid"));
  }
}

function mostrarImagenModal(index){
  if(!window.modalImages || !window.modalImages.length) return;

  const total = window.modalImages.length;
  const indexNormalizado = ((index % total) + total) % total;
  window.modalIndex = indexNormalizado;

  const modalImg = document.getElementById("modalImg");
  if(!modalImg) return;

  modalImg.src = window.modalImages[indexNormalizado];
}

function abrirModalCollage(){
  if(!window.modalImages || !window.modalImages.length) return;

  const modalCollage = document.getElementById("modalCollage");
  const modalCollageGrid = document.getElementById("modalCollageGrid");
  if(!modalCollage || !modalCollageGrid) return;

  modalCollageGrid.innerHTML = "";

  window.modalImages.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${productoActual || "Producto"} - imagen ${index + 1}`;
    img.loading = "lazy";
    img.className = "modal-collage-item";
    img.addEventListener("click", () => {
      window.modalIndex = index;
      mostrarImagenModal(index);
      cerrarModalCollage();
    });
    modalCollageGrid.appendChild(img);
  });

  modalCollage.classList.add("activo");
}

function cerrarModalCollage(){
  const modalCollage = document.getElementById("modalCollage");
  if(modalCollage){
    modalCollage.classList.remove("activo");
  }
}