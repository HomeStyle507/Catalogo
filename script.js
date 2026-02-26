// 1. Lista de vendedores
const VENDEDORES = [
    { nombre: "Christian", numero: "6977-8350" },
    { nombre: "Yoli", numero: "6168-3538" },
    { nombre: "Angel", numero: "6260-6548" },
    { nombre: "Mayerlis", numero: "6236-4158" },
    { nombre: "Génesis", numero: "6171-3520" }
];

const DEFAULT_CONFIG = {
  modoRevendedor: false,
  vendedorFijo: null,
  numeroFijo: null,
  requerirClaveDiaria: false,
  secretDiario: "HS507",
  paramClave: "k"
};

const APP_CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.CATALOGO_CONFIG || {})
};

let categoriaBaseActual = "Todos";
let filtroSubcategoriaActual = null;

// 2. Variables de estado
let seleccion = JSON.parse(localStorage.getItem("seleccion")) || [];
let productoActual = null; // <--- ESTA ES LA QUE FALTABA
let tiempoRestante = 7;
let intervaloTimer = null;

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
  const accesoPermitido = validarAccesoPorClaveDiaria();
  if (!accesoPermitido) {
    return;
  }

  aplicarConfiguracionUI();
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
  
  // Aplicar filtrado de agotados al cargar la página
  filtrarCategoria("Todos", null);
  
  // Inicializar productos promocionales (mostrar precio)
  inicializarProductosPromocionales();

  if (APP_CONFIG.modoRevendedor) {
    evaluarPreciosRevendedor();
  }
});

function obtenerClaveDiariaEsperada() {
  const fecha = new Date();
  const y = fecha.getFullYear();
  const inicio = new Date(fecha.getFullYear(), 0, 0);
  const diff = fecha - inicio;
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  const semilla = `${APP_CONFIG.secretDiario}-${y}-${day}`;

  let hash = 0;
  for (let i = 0; i < semilla.length; i++) {
    hash = ((hash << 5) - hash) + semilla.charCodeAt(i);
    hash |= 0;
  }

  const codigo = Math.abs(hash % 100000);
  return String(codigo).padStart(5, "0");
}

function validarAccesoPorClaveDiaria() {
  if (!APP_CONFIG.requerirClaveDiaria) return true;

  const params = new URLSearchParams(window.location.search);
  const claveRecibida = (params.get(APP_CONFIG.paramClave) || "").trim();
  const claveEsperada = obtenerClaveDiariaEsperada();

  if (/^\d{5}$/.test(claveRecibida) && claveRecibida === claveEsperada) {
    return true;
  }

  document.body.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#081a33;color:#ffffff;text-align:center;">
      <section style="max-width:520px;background:#0c2b5e;border:2px solid #e0b75a;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.35)">
        <h1 style="margin:0 0 10px 0;color:#e0b75a;font-size:1.8rem;">Acceso restringido</h1>
        <p style="margin:0;line-height:1.6;">Este enlace requiere una clave diaria de 5 dígitos válida. Solicita la URL actualizada del día.</p>
      </section>
    </main>
  `;

  return false;
}

function aplicarConfiguracionUI() {
  if (!APP_CONFIG.modoRevendedor) return;

  document.body.classList.add("modo-revendedor");
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

function evaluarPreciosRevendedor() {
  document.querySelectorAll(".card").forEach(card => {
    const precio = (card.dataset.precio || "").trim();
    if (!precio) {
      card.classList.add("precio-faltante");
    } else {
      card.classList.remove("precio-faltante");
    }
  });
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
    
    const nombre = card.dataset.nombre || "Producto";
    const descripcion = card.dataset.descripcion || "Producto de alta calidad.";
    const agotado = card.classList.contains("agotado");
    productoActual = nombre;

    document.getElementById("modalImg").src = img.src;
    document.getElementById("modalImg").alt = nombre;
    
    // Usar textContent en lugar de innerHTML para seguridad
    document.getElementById("modalNombre").textContent = nombre;
    document.getElementById("modalDesc").textContent = descripcion;
    
    // Mostrar precio si existe en el dataset (data-precio)
    const precioElem = document.getElementById("modalPrecio");
    const precio = card.dataset.precio || card.dataset.price || null;
    if(precio){
      precioElem.style.display = "block";
      precioElem.textContent = precio;
    } else {
      precioElem.style.display = "none";
      precioElem.textContent = "";
    }

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

/* ================= CERRAR MODAL ================= */
function cerrarModal(){
  document.getElementById("modalImagen").classList.remove("activo");
  cerrarModalCollage();
  productoActual = null;
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
function abrirModalVideo(){
  const modalVideo = document.getElementById("modalVideo");
  if(modalVideo){
    modalVideo.style.display = "flex";
    cerrarMenu(); // Cerrar menú hamburguesa si está abierto
  }
}

function cerrarModalVideo(){
  const modalVideo = document.getElementById("modalVideo");
  const video = document.getElementById("videoUbicacion");
  if(modalVideo){
    modalVideo.style.display = "none";
  }
  if(video){
    video.pause();
  }
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

function filtrar(){
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