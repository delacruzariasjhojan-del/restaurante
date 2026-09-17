// =============================================================
// app.js
// Comportamientos generales del sitio que no pertenecen al
// carrito ni al catálogo de productos: menú móvil, año del
// footer y el panel de "Filtros" en celular (carta.html).
// =============================================================

const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");
const anioActual = document.getElementById("anio-actual");

// -------------------------------------------------------------
// Menú de navegación en móvil
// -------------------------------------------------------------
function abrirMenu() {
  mainNav.classList.add("open");
  navToggle?.setAttribute("aria-expanded", "true");
}
function cerrarMenu() {
  mainNav.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
}

navToggle?.addEventListener("click", () => {
  const yaAbierto = mainNav.classList.contains("open");
  yaAbierto ? cerrarMenu() : abrirMenu();
});

// Cierra el menú móvil al elegir una sección
mainNav?.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", cerrarMenu);
});

// Cierra el menú móvil al hacer clic fuera de él (y fuera del botón que lo abre)
document.addEventListener("click", (evento) => {
  const menuAbierto = mainNav?.classList.contains("open");
  if (!menuAbierto) return;

  const clicDentroDelMenu = mainNav.contains(evento.target);
  const clicEnElBoton = navToggle?.contains(evento.target);

  if (!clicDentroDelMenu && !clicEnElBoton) cerrarMenu();
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
