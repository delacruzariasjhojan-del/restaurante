document.addEventListener("DOMContentLoaded", () => {
  const headerSearch = document.getElementById("header-search");
  const btnToggle = document.getElementById("search-toggle");
  const overlayBuscador = document.getElementById("overlay-buscador");
  const input = document.getElementById("buscador");

 function abrirBuscador() {
  headerSearch?.classList.add("buscador-abierto");
  btnToggle?.classList.add("abierto");
  overlayBuscador?.classList.add("visible");
  setTimeout(() => input?.focus(), 280); // espera a que termine la animación
}

  function cerrarBuscador() {
    headerSearch?.classList.remove("buscador-abierto");
    btnToggle?.classList.remove("abierto");
    overlayBuscador?.classList.remove("visible");
  }

  btnToggle?.addEventListener("click", () => {
    const estaAbierto = headerSearch?.classList.contains("buscador-abierto");
    estaAbierto ? cerrarBuscador() : abrirBuscador();
  });

  // Cierra al hacer clic en el fondo oscuro (fuera del buscador)
  overlayBuscador?.addEventListener("click", cerrarBuscador);
document.addEventListener("buscador:cerrar", cerrarBuscador);
  
});