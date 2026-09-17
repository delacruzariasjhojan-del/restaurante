// =============================================================
// js/pedido.js
// Controla el flujo de checkout: datos del cliente, método de
// pago, el aviso obligatorio, el guardado del pedido en
// Firestore, y el envío del comprobante por WhatsApp.
// =============================================================

import {
  db,
  cuandoAuthListo,
  collection,
  addDoc,
  serverTimestamp,
  COL_PEDIDOS,
} from "./firebase.js";
import { obtenerCarrito, obtenerTotalCarrito, vaciarCarrito, cerrarCarrito } from "./carrito.js";

// Número de WhatsApp del restaurante en formato internacional,
// sin "+" ni espacios (código de país 51 = Perú).
const WHATSAPP_RESTAURANTE = "+51956931873";

// Costo adicional de envío cuando el tipo de entrega es Delivery.
const COSTO_DELIVERY = 2;

// Imagen y texto de cuenta que se muestran según el método de
// pago elegido. Ajusta rutas/nombres de archivo y datos reales.
const DATOS_PAGO = {
  Yape: {
    img: "img/yape.png",
    alt: "Código QR de Yape para el pago",
    numero: "987 654 321",
    numeroLimpio: "987654321",
  },
  Plin: {
    img: "img/plin.png",
    alt: "Código QR de Plin para el pago",
    numero: "987 654 321",
    numeroLimpio: "987654321",
  },
  Transferencia: {
    img: "img/transferencia.png",
    alt: "Datos de cuenta bancaria para transferencia",
    numero: "191-1234567-0-12",
    numeroLimpio: "19112345670012",
  },
};
const modalCheckout = document.getElementById("modal-checkout");
const modalAviso = document.getElementById("modal-aviso");
const modalExito = document.getElementById("modal-exito");

const formCheckout = document.getElementById("form-checkout");
const btnEnviarPedido = document.getElementById("btn-enviar-pedido");

const btnContinuarPedido = document.getElementById("btn-continuar-pedido");
const btnAvisoCancelar = document.getElementById("btn-aviso-cancelar");
const btnAvisoEntendido = document.getElementById("btn-aviso-entendido");
const btnExitoCerrar = document.getElementById("btn-exito-cerrar");
const pedidoNumeroFinal = document.getElementById("pedido-numero-final");

const qrPagoImg = document.getElementById("qr-pago-img");
const qrPagoTexto = document.getElementById("qr-pago-texto");
const radiosMetodoPago = document.querySelectorAll('input[name="metodo_pago"]');

const btnUsarUbicacion = document.getElementById("btn-usar-ubicacion");
const inputDireccion = document.getElementById("c-direccion");
const inputLat = document.getElementById("c-lat");
const inputLng = document.getElementById("c-lng");
const ubicacionEstado = document.getElementById("ubicacion-estado");

const selectTipoEntrega = document.getElementById("c-tipo-entrega");
const totalAPagarMonto = document.getElementById("total-a-pagar-monto");
const totalEnvioNota = document.getElementById("total-envio-nota");
const bloqueDelivery = document.getElementById("bloque-delivery");
const mensajeRecojo = document.getElementById("mensaje-recojo");
const btnCopiarNumero = document.getElementById("btn-copiar-numero");
const numeroPagoTexto = document.getElementById("numero-pago-texto");
const copiarFeedback = document.getElementById("copiar-numero-feedback");

// -------------------------------------------------------------
// Calcula y muestra el total a pagar junto al método de pago:
// el total del carrito, más S/ 2 de envío si el tipo de entrega
// elegido es "Delivery". Se recalcula cada vez que se abre el
// checkout y cada vez que el cliente cambia el tipo de entrega.
// -------------------------------------------------------------
function tipoEntregaSeleccionado() {
  return selectTipoEntrega ? selectTipoEntrega.value : "Delivery";
}

function actualizarTotalMostrado() {
  if (!totalAPagarMonto) return;
  const subtotal = obtenerTotalCarrito();
  const esDelivery = tipoEntregaSeleccionado() === "Delivery";
  const total = subtotal + (esDelivery ? COSTO_DELIVERY : 0);

  totalAPagarMonto.textContent = `S/ ${total.toFixed(2)}`;
  if (totalEnvioNota) totalEnvioNota.classList.toggle("total-envio-nota-oculta", !esDelivery);
}

// Muestra/oculta Dirección + Ubicación + Referencia según el tipo
// de entrega, y muestra el mensaje de recojo cuando corresponde.
function actualizarVisibilidadEntrega() {
  const esDelivery = tipoEntregaSeleccionado() === "Delivery";

  if (bloqueDelivery) bloqueDelivery.hidden = !esDelivery;
  if (mensajeRecojo) mensajeRecojo.hidden = esDelivery;

  // La dirección solo es obligatoria si es Delivery.
  if (inputDireccion) inputDireccion.required = esDelivery;
}

selectTipoEntrega?.addEventListener("change", () => {
  actualizarTotalMostrado();
  actualizarVisibilidadEntrega();
});

selectTipoEntrega?.addEventListener("change", actualizarTotalMostrado);

// -------------------------------------------------------------
// Utilidades de apertura/cierre de modales
// -------------------------------------------------------------
function abrirModal(modal) {
  modal?.classList.add("visible");
}
function cerrarModal(modal) {
  modal?.classList.remove("visible");
}

// Abrir el checkout desde el carrito
btnContinuarPedido?.addEventListener("click", () => {
  if (obtenerCarrito().length === 0) return;
  cerrarCarrito();
  abrirModal(modalCheckout);
  actualizarTotalMostrado();
  actualizarVisibilidadEntrega();
});

// Cerrar cualquier modal con el botón "×" o el data-close
document.querySelectorAll("[data-close]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const modal = document.getElementById(boton.dataset.close);
    cerrarModal(modal);
  });
});

// -------------------------------------------------------------
// Muestra el mensaje de estado de ubicación con un color/ícono
// según el tipo, para que se note más que un simple texto gris:
// "cargando" (en progreso), "ok" (éxito), "aviso" (parcial),
// "error" (falló y necesita acción del cliente).
// -------------------------------------------------------------
function mostrarEstadoUbicacion(mensaje, tipo) {
  if (!ubicacionEstado) return;
  ubicacionEstado.textContent = mensaje;
  ubicacionEstado.className = `ubicacion-estado ubicacion-estado--${tipo}`;
}

// -------------------------------------------------------------
// Botón "Usar mi ubicación actual": pide el GPS del navegador
// (gratis, sin API key) y convierte las coordenadas a una
// dirección legible usando el servicio gratuito de OpenStreetMap
// (Nominatim). Si el cliente no da permiso o falla la red, se
// avisa y el cliente puede seguir escribiendo la dirección a mano.
// -------------------------------------------------------------
// -------------------------------------------------------------
// Copiar número/cuenta de pago al portapapeles
// -------------------------------------------------------------
btnCopiarNumero?.addEventListener("click", async () => {
  const numero = btnCopiarNumero.dataset.numero;
  if (!numero) return;
  try {
    await navigator.clipboard.writeText(numero);
    if (copiarFeedback) {
      copiarFeedback.textContent = "✓ Número copiado";
      setTimeout(() => { copiarFeedback.textContent = ""; }, 2500);
    }
  } catch (error) {
    if (copiarFeedback) copiarFeedback.textContent = "No se pudo copiar. Cópialo manualmente.";
  }
});

btnUsarUbicacion?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    mostrarEstadoUbicacion("Tu navegador no permite compartir ubicación. Escribe la dirección manualmente.", "error");
    return;
  }

  mostrarEstadoUbicacion("Obteniendo tu ubicación…", "cargando");
  btnUsarUbicacion.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (posicion) => {
      const { latitude, longitude } = posicion.coords;
      inputLat.value = latitude;
      inputLng.value = longitude;

      try {
        const respuesta = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
        const datos = await respuesta.json();
        if (datos?.display_name) {
          inputDireccion.value = datos.display_name;
          mostrarEstadoUbicacion("Ubicación detectada. Revisa que la dirección esté correcta.", "ok");
        } else {
          mostrarEstadoUbicacion("Se guardó tu ubicación, pero completa la dirección a mano.", "aviso");
        }
      } catch (error) {
        console.error("Error al convertir coordenadas a dirección:", error);
        mostrarEstadoUbicacion("Se guardó tu ubicación, pero completa la dirección a mano.", "aviso");
      } finally {
        btnUsarUbicacion.disabled = false;
      }
    },
    (error) => {
      console.error("Error de geolocalización:", error);
      let mensaje = "No pudimos acceder a tu ubicación. Escribe la dirección manualmente.";

      if (error.code === error.PERMISSION_DENIED) {
        mensaje = "Bloqueaste el permiso de ubicación. Actívalo en los ajustes de tu navegador (ícono de candado junto a la dirección web) o escribe tu dirección manualmente.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        mensaje = "Tu GPS parece estar apagado. Actívalo en los ajustes de tu celular y vuelve a intentar, o escribe tu dirección manualmente.";
      } else if (error.code === error.TIMEOUT) {
        mensaje = "Tardó demasiado en encontrar tu ubicación. Intenta de nuevo o escribe tu dirección manualmente.";
      }

      mostrarEstadoUbicacion(mensaje, "error");
      btnUsarUbicacion.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// -------------------------------------------------------------
// Cambia la imagen (QR o cuenta) y el texto según el método de
// pago que el cliente seleccione.
// -------------------------------------------------------------
function actualizarDatosPago(metodo) {
  const datos = DATOS_PAGO[metodo];
  if (!datos || !qrPagoImg) return;
  qrPagoImg.src = datos.img;
  qrPagoImg.alt = datos.alt;
  if (numeroPagoTexto) numeroPagoTexto.textContent = datos.numero;
  if (btnCopiarNumero) btnCopiarNumero.dataset.numero = datos.numeroLimpio;
}

radiosMetodoPago.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) actualizarDatosPago(radio.value);
  });
});

// -------------------------------------------------------------
// Envío del formulario: primero se valida y se muestra el aviso
// obligatorio antes de escribir nada en Firebase.
// -------------------------------------------------------------
formCheckout?.addEventListener("submit", (evento) => {
  evento.preventDefault();

  if (obtenerCarrito().length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }
  if (!formCheckout.reportValidity()) return;

  abrirModal(modalAviso);
});

btnAvisoCancelar?.addEventListener("click", () => cerrarModal(modalAviso));

// -------------------------------------------------------------
// Confirmación del aviso: guarda el pedido (sin comprobante)
// -------------------------------------------------------------
btnAvisoEntendido?.addEventListener("click", async () => {
  cerrarModal(modalAviso);
  btnEnviarPedido.disabled = true;
  btnEnviarPedido.textContent = "Enviando pedido…";

  try {
    await cuandoAuthListo(); // asegura que exista una sesión (anónima) antes de escribir

    const datosFormulario = new FormData(formCheckout);
    const metodoPago = datosFormulario.get("metodo_pago");
    const tipoEntrega = datosFormulario.get("tipo_entrega");

    // 1) Armar el documento del pedido (ya no incluye comprobante)
    const carritoActual = obtenerCarrito();
    const subtotal = obtenerTotalCarrito();
    const costoEnvio = tipoEntrega === "Delivery" ? COSTO_DELIVERY : 0;
    const total = subtotal + costoEnvio;
    const numeroPedido = generarNumeroPedido();

    const pedido = {
      numeroPedido,
      fecha: serverTimestamp(),
           cliente: {
        nombre: datosFormulario.get("nombre"),
        celular: datosFormulario.get("celular"),
        direccion: datosFormulario.get("direccion") || "",
        referencia: datosFormulario.get("referencia") || "",
        tipoEntrega,
        observaciones: datosFormulario.get("observaciones") || "",
        lat: datosFormulario.get("lat") || null,
        lng: datosFormulario.get("lng") || null,
      },
      numeroOperacion: datosFormulario.get("nro_operacion") || "",
      productos: carritoActual.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        precioUnitario: item.precio,
        cantidad: item.cantidad,
        subtotal: item.precio * item.cantidad,
      })),
      subtotal,
      costoEnvio,
      total,
      metodoPago,
      estado: "Pendiente",
    };

    // 2) Guardar en Firestore, colección "pedidos"
    await addDoc(collection(db, COL_PEDIDOS), pedido);


    // 3) Limpiar y mostrar confirmación
    vaciarCarrito();
    formCheckout.reset();
    actualizarTotalMostrado();
    actualizarVisibilidadEntrega();

    pedidoNumeroFinal.textContent = `Número de pedido: ${numeroPedido}`;
    cerrarModal(modalCheckout);
    abrirModal(modalExito);
  } catch (error) {
    console.error("Error al enviar el pedido:", error);
    alert("Ocurrió un problema al enviar tu pedido. Por favor intenta nuevamente.");
  } finally {
    btnEnviarPedido.disabled = false;
    btnEnviarPedido.textContent = "Enviar pedido";
  }
});

btnExitoCerrar?.addEventListener("click", () => cerrarModal(modalExito));

// -------------------------------------------------------------
// Genera un número de pedido legible, ej. "FB-24091".
// La verdad de negocio (evitar duplicados) vive en el id que
// Firestore asigna al documento; esto es solo para mostrarle
// algo amigable al cliente.
// -------------------------------------------------------------
function generarNumeroPedido() {
  const ahora = new Date();
  const sello = `${ahora.getFullYear().toString().slice(-2)}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}`;
  const aleatorio = Math.floor(100 + Math.random() * 900);
  return `FB-${sello}${aleatorio}`;
}