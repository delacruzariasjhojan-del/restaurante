// =============================================================
// app.js
// Comportamientos generales del sitio que no pertenecen al
// carrito ni al catálogo de productos: menú móvil, año del
// footer y el panel de "Filtros" en celular (carta.html).
// =============================================================

const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");
const anioActual = document.getElementById("anio-actual");
const btnFiltrosMobile = document.getElementById("btn-filtros-mobile");
const filtrosContenido = document.getElementById("filtros-contenido");

// -------------------------------------------------------------
// Menú de navegación en móvil
// -------------------------------------------------------------
navToggle?.addEventListener("click", () => {
  const abierto = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(abierto));
});

// Cierra el menú móvil al elegir una sección
mainNav?.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", () => {
    mainNav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// -------------------------------------------------------------
// Año dinámico en el footer
// -------------------------------------------------------------
if (anioActual) anioActual.textContent = new Date().getFullYear();

// -------------------------------------------------------------
// Panel de "Filtros" en celular (carta.html): solo existe visualmente
// en pantallas chicas (el CSS lo oculta en escritorio), pero el botón
// funciona igual en cualquier tamaño por si acaso.
// -------------------------------------------------------------
btnFiltrosMobile?.addEventListener("click", () => {
  const abierto = filtrosContenido.classList.toggle("abierto");
  btnFiltrosMobile.setAttribute("aria-expanded", String(abierto));
});

// Al elegir una categoría o un precio dentro del panel, en celular lo
// cerramos para que el cliente vea de inmediato los platos filtrados.
filtrosContenido?.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".tab-cat-icono, .tab-cat");
  if (!boton) return;
  if (window.innerWidth <= 760) {
    filtrosContenido.classList.remove("abierto");
    btnFiltrosMobile?.setAttribute("aria-expanded", "false");
  }
});