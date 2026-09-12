// =============================================================
// js/carrito.js
// Maneja el carrito de compras: agregar, quitar, cambiar
// cantidades, calcular el total y guardarlo en LocalStorage
// para que sobreviva a un refresh de página.
// =============================================================

const CLAVE_LOCALSTORAGE = "fogonDonBeto_carrito";

const cartCountEl = document.getElementById("cart-count");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const cartDrawerEl = document.getElementById("cart-drawer");
const overlayEl = document.getElementById("overlay");
const btnCartOpen = document.getElementById("cart-btn");
const btnCartClose = document.getElementById("cart-close");
const btnContinuar = document.getElementById("btn-continuar-pedido");

// -------------------------------------------------------------
// Estado: lista de { id, nombre, precio, imagen, cantidad }
// -------------------------------------------------------------
let carrito = cargarDeLocalStorage();

function cargarDeLocalStorage() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_LOCALSTORAGE));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(carrito));
}

function formatearPrecio(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

// -------------------------------------------------------------
// Operaciones sobre el carrito
// -------------------------------------------------------------
function agregarProducto(producto) {
  const existente = carrito.find((item) => item.id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
      imagen: producto.imagen || "",
      cantidad: 1,
    });
  }
  persistirYPintar();
  abrirCarrito();
}

function cambiarCantidad(id, delta) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter((i) => i.id !== id);
  }
  persistirYPintar();
}

function quitarProducto(id) {
  carrito = carrito.filter((i) => i.id !== id);
  persistirYPintar();
}

/** Vacía el carrito por completo (se usa tras enviar el pedido). */
export function vaciarCarrito() {
  carrito = [];
  persistirYPintar();
}

/** Devuelve una copia de los ítems actuales del carrito. */
export function obtenerCarrito() {
  return carrito.map((item) => ({ ...item }));
}

/** Devuelve el total actual del carrito, en soles. */
export function obtenerTotalCarrito() {
  return carrito.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);
}

// -------------------------------------------------------------
// Pintado del contador del header y del panel del carrito
// -------------------------------------------------------------
function pintarContador() {
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  if (cartCountEl) cartCountEl.textContent = totalItems;
}

function pintarCarrito() {
  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = "";

  if (carrito.length === 0) {
    cartItemsEl.innerHTML = `<p class="cart-item-vacio">Tu carrito está vacío. Explora el menú y agrega algo rico 🔥</p>`;
    if (btnContinuar) btnContinuar.disabled = true;
    if (cartTotalEl) cartTotalEl.textContent = formatearPrecio(0);
    return;
  }

  const fragmento = document.createDocumentFragment();
  carrito.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    const fila = document.createElement("div");
    fila.className = "cart-item";
    fila.innerHTML = `
      <img src="${item.imagen || "https://via.placeholder.com/60?text=%20"}" alt="${item.nombre}">
      <div>
        <p class="cart-item-nombre">${item.nombre}</p>
        <p class="cart-item-precio">${formatearPrecio(item.precio)} c/u</p>
        <div class="cart-item-qty">
          <button class="qty-btn" data-accion="restar" data-id="${item.id}" aria-label="Disminuir cantidad">−</button>
          <span>${item.cantidad}</span>
          <button class="qty-btn" data-accion="sumar" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-subtotal">${formatearPrecio(subtotal)}</span>
        <button class="btn-quitar" data-accion="quitar" data-id="${item.id}">Quitar</button>
      </div>
    `;
    fragmento.appendChild(fila);
  });
  cartItemsEl.appendChild(fragmento);

  if (btnContinuar) btnContinuar.disabled = false;
  if (cartTotalEl) cartTotalEl.textContent = formatearPrecio(obtenerTotalCarrito());
}

function persistirYPintar() {
  guardarEnLocalStorage();
  pintarContador();
  pintarCarrito();
  // Avisa a otros módulos (por ejemplo pedido.js) que el carrito cambió.
  document.dispatchEvent(new CustomEvent("carrito:actualizado", { detail: obtenerCarrito() }));
}

// -------------------------------------------------------------
// Apertura / cierre del panel lateral
// -------------------------------------------------------------
export function abrirCarrito() {
  cartDrawerEl?.classList.add("open");
  overlayEl?.classList.add("visible");
}

export function cerrarCarrito() {
  cartDrawerEl?.classList.remove("open");
  overlayEl?.classList.remove("visible");
}

// -------------------------------------------------------------
// Listeners
// -------------------------------------------------------------
document.addEventListener("carrito:agregar", (evento) => agregarProducto(evento.detail));

cartItemsEl?.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const { accion, id } = boton.dataset;
  if (accion === "sumar") cambiarCantidad(id, 1);
  if (accion === "restar") cambiarCantidad(id, -1);
  if (accion === "quitar") quitarProducto(id);
});

btnCartOpen?.addEventListener("click", abrirCarrito);
btnCartClose?.addEventListener("click", cerrarCarrito);
overlayEl?.addEventListener("click", cerrarCarrito);

// -------------------------------------------------------------
// Pintado inicial (por si el carrito ya tenía productos guardados)
// -------------------------------------------------------------
pintarContador();
pintarCarrito();
