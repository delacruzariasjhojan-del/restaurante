// Contenido de tu archivo carta.js
document.addEventListener('DOMContentLoaded', () => {
  const thumbnails = document.querySelectorAll('.carta-thumb');
  const mainImage = document.getElementById('carta-main-img');

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', function() {
      // 1. Quitar la clase 'active' de todas las miniaturas
      thumbnails.forEach(t => t.classList.remove('active'));
      
      // 2. Agregar la clase 'active' a la miniatura clickeada
      this.classList.add('active');
      
      // 3. Efecto de transición para la imagen grande
      mainImage.style.opacity = '0';
      
      setTimeout(() => {
        // Cambiar el src de la imagen grande por el data-src de la miniatura
        mainImage.src = this.getAttribute('data-src');
        mainImage.style.opacity = '1';
      }, 150); 
    });
  });
});