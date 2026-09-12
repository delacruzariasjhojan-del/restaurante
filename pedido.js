// =============================================================
// js/pedido.js
// Controla el flujo de checkout: datos del cliente, método de
// pago, subida del comprobante a Firebase Storage, el aviso
// obligatorio, y el guardado final del pedido en Firestore.
// =============================================================

import {
  db,
  storage,
  cuandoAuthListo,
  collection,
  addDoc,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  COL_PEDIDOS,
  CARPETA_COMPROBANTES,
} from "./firebase.js";
import { obtenerCarrito, obtenerTotalCarrito, vaciarCarrito, cerrarCarrito } from "./carrito.js";

const modalCheckout = document.getElementById("modal-checkout");
const modalAviso = document.getElementById("modal-aviso");
const modalExito = document.getElementById("modal-exito");

const formCheckout = document.getElementById("form-checkout");
const inputComprobante = document.getElementById("c-comprobante");
const previewBox = document.getElementById("comprobante-preview");
const previewImg = document.getElementById("comprobante-preview-img");
const previewNombre = document.getElementById("comprobante-nombre");
const btnEnviarPedido = document.getElementById("btn-enviar-pedido");

const btnContinuarPedido = document.getElementById("btn-continuar-pedido");
const btnAvisoCancelar = document.getElementById("btn-aviso-cancelar");
const btnAvisoEntendido = document.getElementById("btn-aviso-entendido");
const btnExitoCerrar = document.getElementById("btn-exito-cerrar");
const pedidoNumeroFinal = document.getElementById("pedido-numero-final");

let archivoComprobante = null;

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
});

// Cerrar cualquier modal con el botón "×" o el data-close
document.querySelectorAll("[data-close]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const modal = document.getElementById(boton.dataset.close);
    cerrarModal(modal);
  });
});

// -------------------------------------------------------------
// Vista previa del comprobante de pago (JPG / PNG / JPEG)
// -------------------------------------------------------------
inputComprobante?.addEventListener("change", () => {
  const archivo = inputComprobante.files?.[0];
  if (!archivo) {
    archivoComprobante = null;
    previewBox.hidden = true;
    return;
  }

  const tiposValidos = ["image/jpeg", "image/jpg", "image/png"];
  if (!tiposValidos.includes(archivo.type)) {
    alert("Solo se aceptan imágenes en formato JPG, JPEG o PNG.");
    inputComprobante.value = "";
    archivoComprobante = null;
    previewBox.hidden = true;
    return;
  }

  archivoComprobante = archivo;
  const lector = new FileReader();
  lector.onload = (evento) => {
    previewImg.src = evento.target.result;
    previewNombre.textContent = archivo.name;
    previewBox.hidden = false;
  };
  lector.readAsDataURL(archivo);
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

  if (!archivoComprobante) {
    alert("Debes adjuntar el comprobante de pago antes de enviar el pedido.");
    return;
  }

  abrirModal(modalAviso);
});

btnAvisoCancelar?.addEventListener("click", () => cerrarModal(modalAviso));

// -------------------------------------------------------------
// Confirmación del aviso: sube el comprobante y guarda el pedido
// -------------------------------------------------------------
btnAvisoEntendido?.addEventListener("click", async () => {
  cerrarModal(modalAviso);
  btnEnviarPedido.disabled = true;
  btnEnviarPedido.textContent = "Enviando pedido…";

  try {
    await cuandoAuthListo(); // asegura que exista una sesión (anónima) antes de escribir/subir

    const datosFormulario = new FormData(formCheckout);
    const metodoPago = datosFormulario.get("metodo_pago");

    // 1) Subir comprobante a Firebase Storage
    const nombreArchivo = `${Date.now()}_${archivoComprobante.name}`;
    const referenciaStorage = ref(storage, `${CARPETA_COMPROBANTES}/${nombreArchivo}`);
    await uploadBytes(referenciaStorage, archivoComprobante);
    const urlComprobante = await getDownloadURL(referenciaStorage);

    // 2) Armar el documento del pedido
    const carritoActual = obtenerCarrito();
    const total = obtenerTotalCarrito();
    const numeroPedido = generarNumeroPedido();

    const pedido = {
      numeroPedido,
      fecha: serverTimestamp(),
      cliente: {
        nombre: datosFormulario.get("nombre"),
        celular: datosFormulario.get("celular"),
        direccion: datosFormulario.get("direccion"),
        referencia: datosFormulario.get("referencia") || "",
        distrito: datosFormulario.get("distrito"),
        observaciones: datosFormulario.get("observaciones") || "",
      },
      productos: carritoActual.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        precioUnitario: item.precio,
        cantidad: item.cantidad,
        subtotal: item.precio * item.cantidad,
      })),
      total,
      metodoPago,
      comprobanteUrl: urlComprobante,
      estado: "Pendiente",
    };

    // 3) Guardar en Firestore, colección "pedidos"
    await addDoc(collection(db, COL_PEDIDOS), pedido);

    // 4) Limpiar y mostrar confirmación
    vaciarCarrito();
    formCheckout.reset();
    previewBox.hidden = true;
    archivoComprobante = null;

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
