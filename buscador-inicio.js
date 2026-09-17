// =============================================================
// buscador-inicio.js
// Vive solo en index.html. Da autocompletado en vivo en el
// buscador del header: trae los productos de Firestore una sola
// vez y pinta un dropdown con foto + nombre mientras se escribe.
// Al hacer clic en un resultado (o Enter), manda a carta.html
// con ese texto ya aplicado como búsqueda.
// =============================================================

import { db, collection, getDocs, COL_PRODUCTOS } from "./firebase.js";

const input = document.getElementById("buscador");
const contenedorBusqueda = input?.closest(".header-search");

let productosCache = null;
let dropdown = null;

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function obtenerProductos() {
  if (productosCache) return productosCache;
  const snapshot = await getDocs(collection(db, COL_PRODUCTOS));
  productosCache = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      nombre: data.name || data.nombre || "Producto sin nombre",
      descripcion: data.description || data.descripcion || "",
      categoria: data.category || data.categoria || "",
      imagen: data.imagePath || data.imagen || "",
    };
  });
  return productosCache;
}

function crearDropdown() {
  dropdown = document.createElement("div");
  dropdown.className = "buscador-resultados";
  dropdown.hidden = true;
  contenedorBusqueda?.appendChild(dropdown);
}

function pintarResultados(lista, texto) {
  if (!dropdown) crearDropdown();

  if (!texto) {
    dropdown.hidden = true;
    dropdown.innerHTML = "";
    return;
  }

  if (lista.length === 0) {
    dropdown.innerHTML = `<p class="buscador-vacio">No encontramos platos con "${texto}".</p>`;
    dropdown.hidden = false;
    return;
  }

  dropdown.innerHTML = lista
    .slice(0, 8)
    .map(
      (item) => `
        <button type="button" class="buscador-item" data-nombre="${item.nombre}">
          <img src="${item.imagen || "https://via.placeholder.com/60?text=%20"}" alt="${item.nombre}">
          <span>${item.nombre}</span>
        </button>
      `
    )
    .join("");
  dropdown.hidden = false;
}

async function manejarInput() {
  const texto = input.value.trim();
  if (!texto) {
    pintarResultados([], "");
    return;
  }

  const productos = await obtenerProductos();
  const textoNormalizado = normalizarTexto(texto);
  const filtrados = productos.filter((item) => {
    return (
      normalizarTexto(item.nombre).includes(textoNormalizado) ||
      normalizarTexto(item.descripcion).includes(textoNormalizado) ||
      normalizarTexto(item.categoria).includes(textoNormalizado)
    );
  });

  pintarResultados(filtrados, texto);
}

function irACarta(texto) {
  window.location.href = texto
    ? `carta.html?buscar=${encodeURIComponent(texto)}`
    : "carta.html";
}

input?.addEventListener("input", manejarInput);

input?.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    irACarta(input.value.trim());
  }
});

contenedorBusqueda?.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".buscador-item");
  if (boton) irACarta(boton.dataset.nombre);
});

// Cierra el dropdown si el usuario hace clic fuera del buscador.
document.addEventListener("click", (evento) => {
  if (dropdown && !contenedorBusqueda?.contains(evento.target)) {
    dropdown.hidden = true;
  }
});