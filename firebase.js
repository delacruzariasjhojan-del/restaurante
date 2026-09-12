// =============================================================
// js/firebase.js
// Inicializa Firebase (App, Firestore, Storage y Auth) usando el
// SDK modular v10 servido directamente desde el CDN de Google.
// Al usar el CDN, este proyecto no necesita npm/webpack y funciona
// tal cual en GitHub Pages.
// =============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// -------------------------------------------------------------
// 1) CONFIGURACIÓN DE FIREBASE (proyecto real: restaurante-2b67f)
// -------------------------------------------------------------
// Estas claves son públicas por diseño en apps web de Firebase;
// la seguridad real se controla con las Reglas de Firestore/Storage,
// no ocultando este objeto.
const firebaseConfig = {
  apiKey: "AIzaSyDtUUG2vJSTzrpGqKSbMuCDnbm9ncdRl2s",
  authDomain: "restaurante-2b67f.firebaseapp.com",
  projectId: "restaurante-2b67f",
  storageBucket: "restaurante-2b67f.firebasestorage.app",
  messagingSenderId: "367398084212",
  appId: "1:367398084212:web:1eb70f535954849c037b21",
  measurementId: "G-V35NMP6Z25",
};

// -------------------------------------------------------------
// 2) INICIALIZACIÓN
// -------------------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Sesión anónima: permite que las Reglas de seguridad exijan
// "request.auth != null" para crear pedidos y subir comprobantes,
// sin pedirle al cliente que inicie sesión con usuario y clave.
// El panel de administrador (futuro) usará email/clave sobre esta
// misma instancia de Auth.
//
// IMPORTANTE: esto solo funciona si el proveedor "Anonymous" está
// activado en Firebase Console → Authentication → Sign-in method.
signInAnonymously(auth).catch((error) => {
  console.error("No se pudo iniciar sesión anónima en Firebase:", error);
});

let usuarioListo = false;
const listosCallbacks = [];

onAuthStateChanged(auth, (user) => {
  usuarioListo = !!user;
  if (user) {
    listosCallbacks.splice(0).forEach((cb) => cb(user));
  }
});

/** Resuelve cuando Firebase Auth ya tiene una sesión (anónima o no). */
function cuandoAuthListo() {
  return new Promise((resolve) => {
    if (usuarioListo && auth.currentUser) {
      resolve(auth.currentUser);
    } else {
      listosCallbacks.push(resolve);
    }
  });
}

// -------------------------------------------------------------
// 3) NOMBRES DE COLECCIONES / CARPETAS (constantes)
// -------------------------------------------------------------
const COL_PRODUCTOS = "productos";
const COL_CATEGORIAS = "categorias";
const COL_PROMOCIONES = "promociones";
const COL_PEDIDOS = "pedidos";
const CARPETA_COMPROBANTES = "comprobantes";

// -------------------------------------------------------------
// 4) EXPORTS: se reutilizan en productos.js, carrito.js y pedido.js
// -------------------------------------------------------------
export {
  app,
  db,
  storage,
  auth,
  cuandoAuthListo,
  collection,
  doc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  ref,
  uploadBytes,
  getDownloadURL,
  COL_PRODUCTOS,
  COL_CATEGORIAS,
  COL_PROMOCIONES,
  COL_PEDIDOS,
  CARPETA_COMPROBANTES,
};