# Papas Queen's - Frontend Cliente 🥔👑

Este proyecto es el **frontend de clientes** de Papas Queen's, construido con **React + Vite**. Permite que los clientes naveguen el menú, armen su carrito, creen pedidos y hagan seguimiento en tiempo real. 🚀

---

## 1. Stack y dependencias principales 🧱

- **React 18** (`react`, `react-dom`).
- **React Router 6** (`react-router-dom`) para el enrutamiento SPA.
- **Vite** como bundler y dev server.
- **Leaflet + React Leaflet** (`leaflet`, `react-leaflet@4.2.1`) para el mapa de dirección en la página de cuenta.

> 📦 Ver `package.json` para la lista completa de dependencias.

---

## 2. Mapa de dirección en la página de cuenta 🗺️

La página **`/account`** (`src/pages/Account.jsx`) permite que el cliente seleccione su **dirección de entrega** usando un mapa interactivo y un buscador de direcciones.

### 2.1. Qué hace el componente de mapa 🧭

En `Account.jsx` se integró **React Leaflet + Nominatim (OpenStreetMap)** para:

- Mostrar un **mapa centrado en Lima, Perú**.
- Tener un **marcador (pin) draggable**:
  - Al arrastrar el pin, se obtienen las coordenadas (`lat`, `lng`).
  - Se llama a la API de **reverse geocoding** de Nominatim para transformar `lat/lng` → dirección en texto.
  - La dirección devuelta actualiza automáticamente el `textarea` de "Dirección de entrega".
- Permitir hacer **click en el mapa** para mover el pin y actualizar la dirección igual que con drag.
- Incluir un **buscador con autocompletado** encima del mapa:
  - A medida que escribes (desde 3 caracteres), se llama a `https://nominatim.openstreetmap.org/search`.
  - Se muestran hasta 5 **sugerencias de direcciones reales** en Lima.
  - Al seleccionar una sugerencia:
    - Se centra el mapa en esa ubicación.
    - Se mueve el pin.
    - Se actualiza el `textarea` de dirección.

> 🔎 Las búsquedas están **restringidas a Lima, Perú** usando parámetros `countrycodes=pe`, `viewbox=...` y `bounded=1` en la URL de Nominatim.

### 2.2. Error inicial con React Leaflet y cómo se resolvió 🛠️

Durante la integración del mapa se encontró un problema de dependencias:

- El proyecto tiene **`react@18.3.1`**.
- La versión más reciente **`react-leaflet@5.0.0`** exige **React 19** (`peer react@^19.0.0`).
- Al intentar instalar `react-leaflet` sin versión fija:

```bash
npm install react-leaflet leaflet
```

`npm` devolvió este error de resolución de dependencias (`ERESOLVE`):

- *"Found: react@18.3.1 ... Could not resolve dependency: peer react@^19.0.0 from react-leaflet@5.0.0"*

📌 **Solución aplicada** ✅:

- Se instaló una versión **compatible con React 18**, fijando `react-leaflet` a la serie 4.x:

```bash
npm install react-leaflet@4 leaflet
# y luego se fijó concretamente
npm install react-leaflet@4.2.1 leaflet
```

- Con `react-leaflet@4.2.1` el proyecto compila sin conflictos de peer dependencies.
- Finalmente se importó el CSS de Leaflet en el entrypoint (`src/main.jsx` o equivalente):

```js
import 'leaflet/dist/leaflet.css'
```

Con esto, el mapa y el pin se muestran correctamente y el formulario de dirección queda integrado con el mapa. ✨

---

## 3. Integración con el backend 🧬

Este frontend **cliente** está pensado para consumir únicamente los endpoints expuestos por el microservicio **`orders-svc`** del backend (más los endpoints de autenticación de clientes). Toda la comunicación HTTP se hace a través de `src/api/client.js`.

### 3.1. Cliente de API (`src/api/client.js`) 🔌

- `API_BASE` apunta al API Gateway del backend en AWS:
  - `https://id8sfymfb7.execute-api.us-east-1.amazonaws.com/dev`
- Añade automáticamente headers multi-tenant y de autenticación:
  - `Authorization: Bearer <token>`.
  - `X-Tenant-Id`, `X-User-Id`, `X-User-Email`, `X-User-Type`.
- Maneja errores HTTP parseando mensajes legibles desde la respuesta.

Funciones exportadas principales:

- `api(path, opts)` → wrapper general para llamadas REST.
- `getAuth`, `setAuth` → manejo de sesión del cliente en `localStorage`.
- `getTenantId`, `setTenantId` → manejo de multi-tenant.
- Utilidades de UI: `formatPrice`, `haversine`, `formatDuration`.

### 3.2. Endpoints del backend que consume este frontend 🌐

Se asume que el frontend cliente sólo interactúa con **`orders-svc`** y los endpoints de login de clientes, sobre el API Gateway configurado en el backend.

Endpoints relevantes (definidos en el `serverless.yml` del backend):

- **Pedidos (orders-svc)**
  - `POST /orders` → crear pedido.
  - `GET /orders/{id_order}` → obtener detalle de pedido.
  - `GET /orders/{id_order}/status` → obtener estado de un pedido.
  - `GET /orders/customer/{id_customer}` → listar pedidos de un cliente.
  - `PATCH /orders/{id_order}/status` → actualizar estado de pedido.
  - `POST /orders/{id_order}/cancel` → cancelar pedido.
  - `PATCH /auth/customer/profile` → actualizar perfil y **dirección de entrega** del cliente (usa el valor que viene del mapa en `Account.jsx`).

- **Login de clientes (register)**
  - `POST /auth/customer/login` → login de cliente, devuelve token y datos para `localStorage`.

> 🧩 El resto de microservicios (`kitchen-svc`, `delivery-svc`, `analytics-svc`) son consumidos por el frontend de staff/administración, no por este frontend de clientes.

---

## 4. Páginas principales del frontend cliente 📄

Arquitectura SPA basada en rutas definidas en `src/App.jsx`.

- **`/` – Home (`Home.jsx`)** 🏠
  - Landing principal para el cliente, resumen de la propuesta de valor.

- **`/menu` – Menú (`Menu.jsx`)** 📜
  - Lista de productos del menú.
  - Permite agregar productos al carrito.

- **`/cart` – Carrito (`Cart.jsx`)** 🛒
  - Muestra los productos agregados.
  - Permite confirmar el pedido (llamando a `POST /orders`).

- **`/orders` – Pedidos activos (`ActiveOrders.jsx`)** 📦
  - Lista de pedidos recientes del cliente.
  - Consulta `GET /orders/customer/{id_customer}` y/o `GET /orders/{id_order}/status`.

- **`/track` – Seguimiento (`Track.jsx`)** 📍
  - Permite ver el estado y tracking de un pedido activo.
  - Usa información expuesta por el backend (estado del pedido, tiempos estimados, etc.).

- **`/account` – Mi cuenta (`Account.jsx`)** 🙋‍♀️
  - Muestra y permite editar datos básicos del cliente.
  - Integra el **textarea de dirección** con el **mapa de Leaflet + Nominatim** descrito en la sección 2.
  - Al guardar, llama a `PATCH /auth/customer/profile` en `orders-svc`.

- **`/login` – Login (`Login.jsx`)** 🔐
  - Autenticación de clientes vía `POST /auth/customer/login`.

- **`/locales` – Locales (`Locales.jsx`)** 📍
  - Información de sucursales disponibles.

- **Paginas de error** ⚠️
  - `NotFound.jsx` → ruta 404.
  - `ServerError.jsx` → página de error genérico.

---

## 5. Cómo ejecutar el frontend cliente 🚀

Desde `frontend/customer`:

```bash
npm install
npm run dev
```

Luego abrir en el navegador la URL que indique Vite (por defecto `http://localhost:5173/`).

> ✅ Asegúrate de tener el backend desplegado y accesible en la URL configurada en `API_BASE` para que las llamadas funcionen correctamente.
