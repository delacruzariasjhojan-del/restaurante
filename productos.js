// =============================================================
// productos.js
// Vive solo en carta.html. Trae productos y promociones desde
// Firestore y controla las pestañas de categoría (con "Promociones"
// como una pestaña más), el buscador y los chips de filtro de precio.
//
// Comunica con carrito.js mediante el CustomEvent "carrito:agregar"
// en vez de importarlo directamente.
// =============================================================

import { db, collection, getDocs, COL_PRODUCTOS, COL_PROMOCIONES } from "./firebase.js";

// Estado en memoria: se piden una sola vez a Firestore y luego solo
// se filtran/re-pintan en el cliente.
let todosLosProductos = [];
let todasLasPromos = [];

const gridProductos = document.getElementById("productos-grid");
const estadoProductos = document.getElementById("productos-estado");

const inputBuscador = document.getElementById("buscador");
const tabsCategorias = document.getElementById("categorias-tabs");

let categoriaActiva = "Plato Principal";

// Imagen por categoría. La clave debe coincidir EXACTO con el nombre
// de categoría en Firestore (o "Promociones"). Pon aquí tus rutas.
const imagenesCategorias = {
  "Promociones": "img/cat-promociones.png",
  "Plato Principal": "img/cat-plato-principal.png",
  "Entrada": "img/cat-entrada.png",
  "Acompañamiento": "img/cat-acompanamiento.png",
  "Agua": "img/cat-agua.png",
  "Gaseosa": "img/cat-gaseosa.png",
  "Refresco": "img/cat-refresco.png",
  "Postre": "img/cat-postre.png",
  "Alcohol": "img/cat-alcohol.png",
};
const imagenCategoriaPorDefecto = "img/cat-default.jpg";

// -------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------
function formatearPrecio(valor) {
  return `S/ ${(Number(valor) || 0).toFixed(2)}`;
}

function calcularDescuento(precio, precioAntes) {
  if (!precioAntes || precioAntes <= precio) return null;
  return Math.round(((precioAntes - precio) / precioAntes) * 100);
}

// Normaliza texto para comparar categorías sin que fallen por mayúsculas,
// tildes o espacios de más (ej. "Plato Principal " === "plato principal").
function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// -------------------------------------------------------------
// Tarjeta: sirve tanto para productos del menú como para promociones,
// porque ambos se normalizan al mismo formato antes de pintarlos.
// -------------------------------------------------------------
function crearTarjeta(item) {
  const disponible = item.disponible !== false;
  const descuento = calcularDescuento(item.precio, item.precioAntes);

  const card = document.createElement("article");
  card.className = "producto-card";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="producto-media">
      <img src="${item.imagen || "https://via.placeholder.com/400x300?text=Sin+imagen"}"
           alt="${item.nombre}" loading="lazy">
      ${descuento ? `<span class="tag-descuento">-${descuento}%</span>` : ""}
      ${!disponible ? `<span class="tag-agotado">Agotado</span>` : ""}
      <button class="fav-btn" type="button" aria-label="Guardar en favoritos" aria-pressed="false">♡</button>
    </div>
    <div class="producto-body">
      <span class="producto-cat">${item.categoriaMostrar || ""}</span>
      <h3 class="producto-nombre">${item.nombre}</h3>
      <p class="producto-desc">${item.descripcion || ""}</p>
      <div class="producto-precio-row">
        <div class="producto-precios">
          <span class="precio-actual">${formatearPrecio(item.precio)}</span>
          ${item.precioAntes ? `<span class="precio-antes">${formatearPrecio(item.precioAntes)}</span>` : ""}
        </div>
        <button class="btn-agregar-circular" data-id="${item.id}" ${disponible ? "" : "disabled"} aria-label="Agregar al carrito">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
            <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  return card;
}

// Da una señal visual notoria en el propio botón circular al agregar:
// cambia el ícono a un check, se pone verde y hace un "pop", por un
// instante breve, luego vuelve a la normalidad.
function mostrarFeedbackAgregado(boton) {
  if (boton.dataset.animando === "1") return; // evita solaparse si hacen doble clic
  boton.dataset.animando = "1";

  const iconoOriginal = boton.innerHTML;

  boton.classList.add("btn-agregar-exito");
  boton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
      <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  setTimeout(() => {
    boton.classList.remove("btn-agregar-exito");
    boton.innerHTML = iconoOriginal;
    boton.dataset.animando = "0";
  }, 900);
}

// Si venimos de index.html con ?buscar=algo en la URL, precargamos
// ese texto en el buscador antes de pintar el grid.
function aplicarBusquedaDesdeURL() {
  const parametros = new URLSearchParams(window.location.search);
  const texto = parametros.get("buscar");
  if (texto && inputBuscador) {
    inputBuscador.value = texto;
  }
}
// -------------------------------------------------------------
// Pinta el grid según la pestaña activa (Promociones o una categoría)
// -------------------------------------------------------------
function pintarGrid(lista) {
  gridProductos.innerHTML = "";

  if (lista.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "productos-estado";
    vacio.textContent = "No encontramos platos con esos filtros. Prueba con otra búsqueda.";
    gridProductos.appendChild(vacio);
    return;
  }

  const fragmento = document.createDocumentFragment();
  lista.forEach((item) => fragmento.appendChild(crearTarjeta(item)));
  gridProductos.appendChild(fragmento);
}

function aplicarFiltrosYPintar() {
  const texto = (inputBuscador?.value || "").trim();
  const hayBusqueda = texto.length > 0;

  // Avisamos al resto del sitio (app.js) si hay una búsqueda activa,
  // para que el header/buscador NO se oculte al bajar el scroll.
  document.dispatchEvent(new CustomEvent("buscador:estado", { detail: { activo: hayBusqueda } }));

  // Si el usuario empieza a escribir, bajamos hacia la grilla.
  if (hayBusqueda) {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Mientras hay algo escrito en el buscador, ninguna pestaña de categoría
  // queda marcada como activa (visualmente), porque el buscador manda y
  // busca en todo, sin importar la categoría seleccionada.
  tabsCategorias?.querySelectorAll(".tab-cat-icono").forEach((boton) => {
    boton.classList.toggle("active", !hayBusqueda && boton.dataset.cat === categoriaActiva);
  });

  let fuente;
  if (hayBusqueda) {
    fuente = [...todosLosProductos, ...todasLasPromos]; // el buscador rompe el filtro de categoría
  } else if (categoriaActiva === "todos") {
    fuente = todosLosProductos; // pestaña "Todos": todos los platos, sin filtrar por categoría
  } else if (categoriaActiva === "Promociones") {
    fuente = todasLasPromos;
  } else {
    fuente = todosLosProductos;
  }

  const filtrados = fuente.filter((item) => {
    if (!hayBusqueda) {
      const esCategoriaEspecifica = categoriaActiva !== "todos" && categoriaActiva !== "Promociones";
      if (esCategoriaEspecifica && normalizarTexto(item.categoria) !== normalizarTexto(categoriaActiva)) return false;
    }

    if (hayBusqueda) {
      const coincideNombre = normalizarTexto(item.nombre).includes(normalizarTexto(texto));
      const coincideDescripcion = normalizarTexto(item.descripcion).includes(normalizarTexto(texto));
      const coincideCategoria = normalizarTexto(item.categoria || item.categoriaMostrar).includes(normalizarTexto(texto));
      if (!coincideNombre && !coincideDescripcion && !coincideCategoria) return false;
    }

    return true;
  });

  pintarGrid(filtrados);
}

// -------------------------------------------------------------
// Carga de datos desde Firestore
// -------------------------------------------------------------
async function cargarProductos() {
  const snapshot = await getDocs(collection(db, COL_PRODUCTOS));
  todosLosProductos = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    // Traduce el esquema real de Firestore (en inglés) al formato
    // interno que usan las tarjetas (en español). Acepta "category" o
    // "categoria" por si el documento quedó con cualquiera de los dos.
    const categoria = data.category || data.categoria || "";
    return {
      id: docSnap.id,
      nombre: data.name || data.nombre || "Producto sin nombre",
      descripcion: data.description || data.descripcion || "",
      precio: data.price ?? data.precio,
      precioAntes: data.priceBefore ?? data.precioAntes, // opcional, si algún día agregas ese campo
      categoria,
      categoriaMostrar: categoria,
      imagen: data.imagePath || data.imagen || "",
      disponible: (data.available ?? data.disponible) !== false, // si no existe el campo, se asume disponible
      popular: !!data.isPopular,
      rating: data.rating,
      reviews: data.reviews,
      ingredientes: data.ingredients || [],
    };
  });

  // Diagnóstico: abre la consola del navegador (F12) para ver esto.
  console.log(`[productos] Documentos leídos de "${COL_PRODUCTOS}":`, todosLosProductos.length);
  console.log(
    "[productos] Categorías detectadas:",
    [...new Set(todosLosProductos.map((p) => p.categoria))]
  );
}

async function cargarPromociones() {
  const snapshot = await getDocs(collection(db, COL_PROMOCIONES));
  todasLasPromos = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    // Normaliza el documento de "promociones" al mismo formato que
    // usan las tarjetas de producto (nombre/descripcion/imagen/precio).
    return {
      id: docSnap.id,
      nombre: data.titulo || data.nombre || "Promoción",
      descripcion: data.descripcion || "",
      precio: data.precio,
      precioAntes: data.precioAntes,
      imagen: data.imagen,
      disponible: data.disponible !== false,
      categoriaMostrar: "Promoción",
    };
  });

  console.log(`[promociones] Documentos leídos de "${COL_PROMOCIONES}":`, todasLasPromos.length);
}

async function iniciarCarga() {
  try {
    await Promise.all([cargarProductos(), cargarPromociones()]);
    renderCategorias();
    aplicarBusquedaDesdeURL(); // <-- nueva línea
    aplicarFiltrosYPintar();
  } catch (error) {
    console.error("Error al cargar la carta desde Firestore:", error);
    gridProductos.innerHTML = "";
    const mensaje = document.createElement("p");
    mensaje.className = "productos-estado";
    mensaje.textContent = "No se pudo cargar la carta. Verifica tu conexión o la configuración de Firebase.";
    gridProductos.appendChild(mensaje);
  }
}

/** Devuelve un producto o promoción ya cargado en memoria, por id. */
export function obtenerProductoPorId(id) {
  return (
    todosLosProductos.find((p) => p.id === id) ||
    todasLasPromos.find((p) => p.id === id) ||
    null
  );
}

// -------------------------------------------------------------
// Pestañas de categoría (incluye "Promociones")
// -------------------------------------------------------------
// -------------------------------------------------------------
// Genera los botones del carrusel a partir de las categorías reales
// detectadas en Firestore. "Promociones" va siempre primero.
// -------------------------------------------------------------
function renderCategorias() {
  const categoriasUnicas = [...new Set(todosLosProductos.map((p) => p.categoria))]
    .filter((cat) => cat && cat.trim() !== "");

const categoriasPrioritarias = ["Plato Principal", "Promociones", "Acompañamiento", "Entrada", "Postre"];
const categoriasRestantes = categoriasUnicas.filter((cat) => !categoriasPrioritarias.includes(cat));
const categorias = [...categoriasPrioritarias, ...categoriasRestantes];

  tabsCategorias.innerHTML = categorias
    .map((cat) => {
      const imagen = imagenesCategorias[cat] || imagenCategoriaPorDefecto;
      const activa = cat === categoriaActiva ? "active" : "";
      return `
        <button class="tab-cat-icono ${activa}" data-cat="${cat}">
          <img src="${imagen}" alt="${cat}" class="tab-cat-img" loading="lazy">
          <span>${cat}</span>
        </button>
      `;
    })
    .join("");
}

tabsCategorias?.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".tab-cat-icono");
  if (!boton) return;

  categoriaActiva = boton.dataset.cat;
  tabsCategorias.querySelectorAll(".tab-cat-icono").forEach((b) => b.classList.remove("active"));
  boton.classList.add("active");

  aplicarFiltrosYPintar();
});


// -------------------------------------------------------------
// Buscador (sin cambios)
// -------------------------------------------------------------
inputBuscador?.addEventListener("input", aplicarFiltrosYPintar);
inputBuscador?.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    inputBuscador.blur();
    document.dispatchEvent(new CustomEvent("buscador:cerrar"));
  }
});

// -------------------------------------------------------------
// Agregar al carrito (delegación) y favoritos (solo visual)
// -------------------------------------------------------------
gridProductos?.addEventListener("click", (evento) => {
  const botonAgregar = evento.target.closest(".btn-agregar-circular");
  if (botonAgregar && !botonAgregar.disabled) {
    const item = obtenerProductoPorId(botonAgregar.dataset.id);
    if (item) {
      document.dispatchEvent(new CustomEvent("carrito:agregar", { detail: item }));
      mostrarFeedbackAgregado(botonAgregar);
    }
    return;
  }

  const botonFav = evento.target.closest(".fav-btn");
  if (botonFav) {
    const activo = botonFav.getAttribute("aria-pressed") === "true";
    botonFav.setAttribute("aria-pressed", String(!activo));
    botonFav.classList.toggle("activo", !activo);
    botonFav.textContent = !activo ? "♥" : "♡";
  }
});

// -------------------------------------------------------------
// Arranque
// -------------------------------------------------------------
iniciarCarga();