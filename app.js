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
const overlayMenu = document.getElementById("overlay-menu");

function abrirMenu() {
  mainNav.classList.add("open");
  navToggle?.setAttribute("aria-expanded", "true");
  overlayMenu?.classList.add("visible");
  document.body.style.overflow = "hidden"; 
}
function cerrarMenu() {
  mainNav.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
  overlayMenu?.classList.remove("visible");
    document.body.style.overflow = ""; 
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
// Buscador: muestra/oculta el botón de limpiar (X) según si hay texto
// -------------------------------------------------------------
document.querySelectorAll('.search-field').forEach((campo) => {
  const input = campo.querySelector('input[type="search"]');
  const btnLimpiar = campo.querySelector('.btn-limpiar-buscador');
  if (!input || !btnLimpiar) return;

  const actualizar = () => campo.classList.toggle('tiene-texto', input.value.length > 0);

  input.addEventListener('input', actualizar);
  btnLimpiar.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });
  actualizar();
});

// -------------------------------------------------------------
// Año dinámico en el footer
// -------------------------------------------------------------
if (anioActual) anioActual.textContent = new Date().getFullYear();

// -------------------------------------------------------------
// Marca como activo el enlace del menú en el que se hace clic.
// -------------------------------------------------------------
// -------------------------------------------------------------
// Marca como activo el enlace del menú según la URL actual
// (archivo + #ancla), y también al hacer clic (para feedback
// inmediato antes de que la página recargue, si aplica).
// -------------------------------------------------------------
const todosLosEnlacesNav = document.querySelectorAll(".main-nav a");

function marcarEnlaceActivoSegunUrl() {
  const paginaActual = window.location.pathname.split("/").pop() || "index.html";
  const esPaginaIndex = paginaActual === "index.html" || paginaActual === "";
  const hashActual = window.location.hash || (esPaginaIndex ? "#inicio" : "");

  let coincidencia = null;

  todosLosEnlacesNav.forEach((enlace) => {
    const href = enlace.getAttribute("href");
    if (!href) return;

    const [paginaEnlace, hashEnlace] = href.split("#");
    if (paginaEnlace !== paginaActual) return;

    if (hashEnlace && `#${hashEnlace}` === hashActual) {
      coincidencia = enlace; // coincidencia exacta por ancla
    } else if (!hashEnlace && !coincidencia) {
      coincidencia = enlace; // enlace sin ancla, ej. "carta.html"
    }
  });

  if (coincidencia) {
    todosLosEnlacesNav.forEach((a) => a.classList.remove("nav-activo"));
    coincidencia.classList.add("nav-activo");
  }
}

marcarEnlaceActivoSegunUrl();

todosLosEnlacesNav.forEach((enlace) => {
  enlace.addEventListener("click", () => {
    todosLosEnlacesNav.forEach((a) => a.classList.remove("nav-activo"));
    enlace.classList.add("nav-activo");
  });
});

// -------------------------------------------------------------
// Header: transparente en el tope de la página. Al bajar el
// scroll se oculta (sube y desaparece). Al subir el scroll,
// reaparece con un degradado rojo semi-transparente para que
// no se mezcle con el contenido de fondo.
// -------------------------------------------------------------
const siteHeader = document.getElementById("site-header");

if (siteHeader) {
  let ultimoScrollY = window.scrollY;
  let ticking = false;
  const UMBRAL = 80;

  // Aplica el estado SOLO según la posición actual (sin comparar
  // dirección). Se usa al cargar/recargar la página, para no
  // depender de si el navegador restauró el scroll de forma animada.
  function fijarEstadoSegunPosicion() {
    const scrollActual = window.scrollY;
    if (scrollActual > UMBRAL) {
      siteHeader.classList.remove("header-oculto");
      siteHeader.classList.add("header-scroll");
    } else {
      siteHeader.classList.remove("header-oculto", "header-scroll");
    }
    ultimoScrollY = scrollActual;
  }

  // Esta SÍ compara dirección: se usa mientras el usuario scrollea
  // activamente (para el efecto de ocultar al bajar / mostrar al subir).
  function actualizarHeaderSegunScroll() {
    const scrollActual = window.scrollY;

    if (scrollActual <= 0) {
      siteHeader.classList.remove("header-oculto", "header-scroll");
    } else if (scrollActual > ultimoScrollY && scrollActual > UMBRAL) {
      siteHeader.classList.add("header-oculto");
    } else if (scrollActual < ultimoScrollY) {
      siteHeader.classList.remove("header-oculto");
      siteHeader.classList.add("header-scroll");
    }

    ultimoScrollY = scrollActual;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(actualizarHeaderSegunScroll);
      ticking = true;
    }
  }, { passive: true });

  // Se aplica varias veces al cargar, por si el navegador restaura
  // el scroll de forma animada o tardía tras el evento "load".
  fijarEstadoSegunPosicion();
  window.addEventListener("load", fijarEstadoSegunPosicion);
  setTimeout(fijarEstadoSegunPosicion, 300);
}
// -------------------------------------------------------------
// Panel de "Filtros" en celular (carta.html): solo existe visualmente
// en pantallas chicas (el CSS lo oculta en escritorio), pero el botón
// funciona igual en cualquier tamaño por si acaso.
// -------------------------------------------------------------