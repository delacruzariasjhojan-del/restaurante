// =============================================================
// app.js
// Comportamientos generales del sitio que no pertenecen al
// carrito ni al catálogo de productos: menú móvil, año del
// footer y el panel de "Filtros" en celular (carta.html).
// =============================================================

const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");
const anioActual = document.getElementById("anio-actual");
const btnCategoriasMobile = document.getElementById("btn-categorias-mobile");
const btnPrecioMobile = document.getElementById("btn-precio-mobile");
const panelCategorias = document.getElementById("categorias-tabs");
const panelPrecio = document.getElementById("filtro-precio-tabs");

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

function togglePanel(boton, panel, otroBoton, otroPanel) {
  const abierto = panel.classList.toggle("panel-abierto");
  boton.setAttribute("aria-expanded", String(abierto));
  if (abierto) {
    otroPanel.classList.remove("panel-abierto");
    otroBoton.setAttribute("aria-expanded", "false");
  }
}

btnCategoriasMobile?.addEventListener("click", () =>
  togglePanel(btnCategoriasMobile, panelCategorias, btnPrecioMobile, panelPrecio)
);
btnPrecioMobile?.addEventListener("click", () =>
  togglePanel(btnPrecioMobile, panelPrecio, btnCategoriasMobile, panelCategorias)
);
// Al elegir una categoría o un precio dentro del panel, en celular lo
// cerramos para que el cliente vea de inmediato los platos filtrados.
panelCategorias?.addEventListener("click", (evento) => {
  if (!evento.target.closest(".tab-cat-icono")) return;
  panelCategorias.classList.remove("panel-abierto");
  btnCategoriasMobile?.setAttribute("aria-expanded", "false");
});