# El Fogón de Don Beto — sitio web del restaurante

Sitio 100% estático (HTML + CSS + JS vanilla) listo para GitHub Pages, con todo el
contenido dinámico (menú, promociones, pedidos) conectado a **Firebase Firestore**
y **Firebase Storage**.

## 1. Estructura de archivos

```
index.html          → home: hero, nosotros, contacto (con header/footer/carrito)
carta.html           → "Nuestra Carta": categorías, promociones, buscador y grid de productos
css/style.css
js/firebase.js     → inicializa Firebase (App, Firestore, Storage, Auth)
js/productos.js     → SOLO se usa en carta.html: carga menú y promociones, tabs, buscador y filtros
js/carrito.js       → lógica del carrito (LocalStorage), se usa en ambas páginas
js/pedido.js        → checkout, comprobante, aviso obligatorio y envío del pedido, se usa en ambas páginas
js/app.js           → menú móvil y detalles generales de la UI, se usa en ambas páginas
img/qr-yape.png     → placeholder del QR de Yape (reemplázalo por el real)
```

El header tiene un solo enlace **"Nuestra Carta"** que lleva a `carta.html`. Ahí es
donde vive todo el catálogo: una pestaña de categoría llamada **Promociones**
(con subfiltros: Todos, Para Compartir, Para 2, Personales, Cupones) y luego
las categorías normales del menú. El carrito y el checkout funcionan igual en
las dos páginas porque el carrito se guarda en LocalStorage.

## 2. Crear el proyecto de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/) → **Crear proyecto**.
2. Agrega una app **Web** y copia el objeto `firebaseConfig`.
3. Pégalo en `js/firebase.js`, reemplazando los valores `"TU_..."`.
4. Activa estos productos desde el menú lateral de la consola:
   - **Firestore Database** (modo producción).
   - **Storage**.
   - **Authentication** → habilita el proveedor **Anónimo** (Anonymous). El sitio
     inicia sesión anónima automáticamente para poder escribir pedidos y subir
     comprobantes sin pedirle credenciales al cliente.

## 3. Estructura de datos en Firestore

### Colección `productos`
```json
{
  "nombre": "Pollo a la Brasa 1/4",
  "descripcion": "Cuarto de pollo marinado 12 horas, papas y ensalada.",
  "precio": 22.5,
  "categoria": "Pollo a la Brasa",
  "imagen": "https://.../pollo.jpg",
  "disponible": true,
  "enPromocion": false
}
```
Categorías sugeridas (deben escribirse exactamente así, coinciden con las
pestañas del sitio): `Pollo a la Brasa`, `Chaufas`, `Hamburguesas`, `Parrillas`,
`Bebidas`, `Postres`, `Combos`.

### Colección `categorias` (opcional, para un futuro panel admin)
```json
{ "nombre": "Pollo a la Brasa", "orden": 1 }
```

### Colección `promociones`
```json
{
  "titulo": "Combo Familiar",
  "descripcion": "1 pollo entero + 2 gaseosas de 1.5L + papas.",
  "precio": 69.9,
  "precioAntes": 99.9,
  "imagen": "https://.../combo.jpg",
  "tipoPromo": "compartir"
}
```
- `precioAntes` es opcional: si lo agregas, la tarjeta muestra el precio tachado
  y el badge de descuento (`-30%`, calculado automáticamente).
- `tipoPromo` es opcional y alimenta los subfiltros de la pestaña Promociones:
  usa `compartir`, `para2`, `personal` o `cupon`. Si no lo pones, la promo solo
  aparece en "Todos".

### Colección `pedidos` (la escribe el sitio automáticamente)
```json
{
  "numeroPedido": "FB-24091412",
  "fecha": "<timestamp del servidor>",
  "cliente": {
    "nombre": "...",
    "celular": "...",
    "direccion": "...",
    "referencia": "...",
    "distrito": "...",
    "observaciones": "..."
  },
  "productos": [
    { "id": "abc123", "nombre": "Pollo 1/4", "precioUnitario": 22.5, "cantidad": 2, "subtotal": 45 }
  ],
  "total": 45,
  "metodoPago": "Yape",
  "comprobanteUrl": "https://firebasestorage.../comprobantes/....jpg",
  "estado": "Pendiente"
}
```

### Storage
- Carpeta `comprobantes/` — ahí se suben las imágenes de los comprobantes de pago.

## 4. Reglas de seguridad sugeridas

**Firestore** (`Firestore → Reglas`):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Lectura pública del menú y promociones
    match /productos/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    match /categorias/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    match /promociones/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Pedidos: cualquier cliente autenticado (incluso anónimo) puede crear
    // un pedido, pero no leer ni editar los de otros clientes.
    match /pedidos/{id} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

**Storage** (`Storage → Reglas`):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /comprobantes/{archivo} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

> El claim `admin` se asigna luego, vía Cloud Functions o manualmente, al usuario
> que use el futuro panel de administración (ya preparado porque `firebase.js`
> exporta `auth` y las funciones necesarias para agregar `signInWithEmailAndPassword`).

## 5. Publicar en GitHub Pages

1. Crea un repositorio y sube todos estos archivos a la raíz (o a `/docs`).
2. En **Settings → Pages**, elige la rama y carpeta donde están los archivos.
3. Espera unos minutos; GitHub te dará la URL pública del sitio.
4. Como todo es HTML/CSS/JS estático y Firebase se llama desde el navegador vía
   CDN, no se necesita build, servidor ni configuración adicional.

## 6. Personalización rápida

- Cambia el nombre, teléfono, WhatsApp y dirección en `index.html`.
- Reemplaza `img/qr-yape.jpeg` por el QR real de tu cuenta Yape/Plin.
- Ajusta los colores del restaurante en las variables `:root` de `css/style.css`.
- Agrega tus productos reales desde la consola de Firestore (o crea un panel de
  administrador aparte; `auth` ya queda listo para eso).
