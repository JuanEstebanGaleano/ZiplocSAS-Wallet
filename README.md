# ZiplocSAS Wallet — Simulador de Monedero Virtual con Sistema de Puntos

Proyecto final de **Estructuras de Datos**. Backend en **Java 21 + Spring Boot 4.0.5 + MongoDB** y frontend en **React 18 + Vite + Tailwind**. Las operaciones del monedero se apoyan en estructuras de datos implementadas desde cero (AVL, tablas hash, heap, lista circular, pila, lista enlazada y grafos); MongoDB solo persiste los datos y se vuelve a cargar en esas estructuras al arrancar.

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| JDK | 21 | Backend |
| MongoDB Community | 6 o superior, en `localhost:27017` | Persistencia (sin usuario ni contraseña) |
| Node.js | 18 o superior (incluye `npm`) | Frontend |

Maven no hace falta instalarlo: el proyecto incluye `mvnw` / `mvnw.cmd`.

## 2. Cómo ejecutarlo

1. **Inicia MongoDB.** La base `ziplocsas_wallet` se crea sola la primera vez; no hay que crearla a mano.
2. **Backend** (desde la raíz del proyecto):
   ```powershell
   .\mvnw.cmd spring-boot:run        # Linux/Mac: ./mvnw spring-boot:run
   ```
   Queda en `http://localhost:8080/api`. En IntelliJ también puedes ejecutar `ProyectoFinalApplication`.
3. **Frontend** (otra terminal):
   ```powershell
   cd ziplocSAS_Front
   npm install
   npm run dev
   ```
   Vite muestra la dirección (normalmente `http://localhost:5173`).
4. **Pruebas del backend:**
   ```powershell
   .\mvnw.cmd test
   ```
   `PlataformaWorkflowTests` y `ProyectoFinalApplicationTests` levantan el contexto de Spring y necesitan MongoDB encendido.

Con la base vacía puedes registrarte desde la pantalla de login y crear tus propias billeteras. Al arrancar, `MongoDataLoader` reconstruye en memoria todas las estructuras (tablas hash, AVL, grafos, colas) desde MongoDB.

**Datos de demostración (opcional).** `DemoDataSeeder` solo se ejecuta si activas `app.seed.demo.enabled=true`; **borra** usuarios, billeteras, transacciones, alertas, programadas y auditoría, y los reemplaza por datos de ejemplo (contraseña de todos los usuarios demo: `Demo2026!`). Si lo usas, reinicia la aplicación después para que `MongoDataLoader` cargue esos datos en memoria. Con `app.seed.demo.exit-after=true` la aplicación termina sola tras sembrar.

### Configuración (`src/main/resources/application.yml`)

| Propiedad | Valor por defecto |
|---|---|
| `spring.data.mongodb.uri` | `mongodb://localhost:27017/ziplocsas_wallet` |
| `server.port` / `server.servlet.context-path` | `8080` / `/api` |
| `app.programadas.procesador.enabled` | `true` (procesa operaciones vencidas) |
| `app.programadas.procesador.intervalo-ms` | `60000` |

### Asistente de IA (opcional)

`AIChat.jsx` usa Groq a través del proxy de Vite. La clave va en `ziplocSAS_Front/.env` como `VITE_GROQ_KEY=...`. **Ese archivo no debe subirse a GitHub ni enviarse en el `.zip`**: agrégalo al `.gitignore` y, si la clave ya se compartió, genera una nueva en el panel de Groq.

---

## 2.1 Cumplimiento del enunciado

| Requisito | Dónde está |
|---|---|
| Operaciones básicas: recarga, retiro, transferencia, reversión | `TransaccionService`, `TransaccionController` (`/transacciones`) |
| Puntos: 1 por cada 100 depositados, 2 por cada 100 retirados, 3 por cada 100 transferidos | `SistemaRecompensas.calcularPuntos` |
| Rangos Bronce 0–500, Plata 501–1000, Oro 1001–5000, Platino >5000 | `NivelUsuario.desdePuntos` |
| Canje: 100 pts = −10 % comisión de transferencia; 500 pts = 1 mes sin comisión de retiro; 1000 pts = bono de 50 | `SistemaRecompensas.inicializarBeneficios`, `CanjeService.canjear` |
| Beneficios por rango | `NivelUsuario` (bono de puntos y descuento de comisión), `PoliticaComisiones` |
| Árbol AVL de puntos y rangos | `ArbolFidelizacion` |
| Operaciones programadas con cola de prioridad | `ColaProgramadas`, `OperacionProgramadaService`, `OperacionProgramadaScheduler` |
| Patrones de gasto con grafos dirigidos | `GrafoPonderado`, `ServicioAnalitica.gastosUsuario` y `analizarPatronesGasto` |
| Transferencias entre clientes (grafo dirigido) | `GrafoTransferencias`, `ServicioAnalitica.grafoTransferencias` |
| Alertas y notificaciones con lista circular | `ColaNotificaciones`, `NotificacionService` |
| Multimonedero con grafo dirigido | `PlataformaContext.grafoBilleteras`, `ServicioAnalitica.grafoBilleteras` |
| Verificación recursiva de integridad | `TransaccionService.verificarIntegridadRecursiva` (`GET /transacciones/integridad`) |
| Historial de puntos y recálculo por reversión | `TablaPuntos`, `UsuarioService.registrarMovimientoPuntos`, `TransaccionService.revertir` |
| Interfaz para operar, ver puntos/rangos y canjear | `ziplocSAS_Front/src/pages` (ver sección 6) |

---

## 3. Arquitectura

Arquitectura por capas, con paquete raíz `ZiplocSAS` en `src/main/java`:

```
HTTP ──► api/controller ──► application/service ──► domain/structures  (memoria)
              │                     │                      ▲
              ▼                     ▼                      │
          api/dto            infrastructure/repository ──► MongoDB
                                                           │
                             infrastructure/persistence ───┘ (carga inicial)
```

| Paquete | Contenido |
|---|---|
| `api/controller` | 7 controladores REST y `ApiExceptionHandler` (errores → `ApiResponse`) |
| `api/dto` | Objetos de entrada/salida (`TransaccionDTO`, `UsuarioDTO`, `ApiResponse`, grafos…) |
| `api/config` | `CorsConfig` |
| `application/service` | Reglas de negocio: usuarios, billeteras, transacciones, puntos, comisiones, canjes, analítica, notificaciones, programadas |
| `domain/model` | Documentos de MongoDB (`Usuario`, `Billetera`, `Transaccion`…) |
| `domain/enums` | Tipos y estados (`NivelUsuario`, `TipoTransaccion`, `TipoBeneficio`…) |
| `domain/structures` | Estructuras de datos propias |
| `infrastructure/repository` | Repositorios Spring Data MongoDB |
| `infrastructure/persistence` | `MongoDataLoader` (recarga estructuras) y `DemoDataSeeder` (datos de demo) |
| `infrastructure/scheduler` | `OperacionProgramadaScheduler` |

`PlataformaContext` es el contenedor singleton que guarda todas las estructuras en memoria y que comparten los servicios.

## 4. Estructuras de datos

| Estructura | Clase | Uso en el proyecto | Complejidad |
|---|---|---|---|
| AVL (rotaciones LL, RR, LR, RL) | `ArbolFidelizacion` | Ranking por puntos, búsqueda por rango, top N, posición en el ranking | insertar/eliminar O(log n); rango O(log n + k) |
| Tabla hash con encadenamiento | `TablaUsuarios`, `TablaPuntos` | Usuarios por id; puntos e historial por cliente | O(1) promedio |
| Tabla hash con direccionamiento abierto (sondeo lineal) | `TablaBilleteras` | Billeteras por id | O(1) promedio |
| Lista enlazada + pila | `GestorTransacciones` | Historial de transacciones y reversión de la última | agregar y revertir O(1) |
| Heap binario (cola de prioridad) | `ColaProgramadas` | Operaciones programadas ordenadas por fecha y prioridad | encolar/extraer O(log n) |
| Lista circular de capacidad fija | `ColaNotificaciones` | Últimas 30 notificaciones por usuario | encolar/despachar O(1) |
| Grafo dirigido ponderado (listas de adyacencia) | `GrafoTransferencias` | Transferencias entre clientes y entre billeteras; ciclos y rutas con DFS | |
| Grafo dirigido ponderado (mapa de adyacencia) | `GrafoPonderado` | Gastos por categoría (cliente→categoría, categoría→categoría) | |
| Recursividad (divide y vencerás) | `TransaccionService.verificarIntegridadRecursiva` | Verificación de integridad del historial | O(n) |

## 5. Reglas de negocio

**Puntos** (por bloques completos de 100 unidades): recarga ×1, retiro y gasto ×2, transferencia y pago programado ×3. Cada rango suma un bono sobre esos puntos: Plata 5 %, Oro 10 %, Platino 20 %.

**Rangos:** Bronce 0–500, Plata 501–1000, Oro 1001–5000, Platino más de 5000. Al cambiar de rango se envía una notificación.

**Comisiones** (el enunciado no fija estos porcentajes; son decisión de diseño):

| Operación | Comisión |
|---|---|
| Transferencia / pago programado | 2 % × (1 − descuento del rango: 0 / 10 / 20 / 30 %) y, con el beneficio de 100 pts activo, × 0,9 |
| Retiro | 1 %; 0 % con el beneficio de 500 pts activo |
| Recarga, gasto, bono | Sin comisión |

**Canje:** descuenta los puntos y registra el movimiento `CANJE`. Los beneficios de descuento y de retiros sin cargo duran 30 días y no se pueden canjear dos veces mientras estén vigentes. El bono de 1000 pts genera una transacción `BONO` de 50 unidades en la billetera elegida.

**Reversión:** devuelve los saldos (incluida la comisión), marca la transacción `REVERTIDA`, descuenta los puntos que había generado (movimiento `REVERSION`, que puede bajar el rango), reconstruye los grafos y registra auditoría.

**Riesgo de una transacción:** `CRITICO` si supera el monto crítico absoluto; en otro caso suma puntos de riesgo (monto alto, monto ≥ 3× el promedio del usuario, 4 o más movimientos en 2 minutos, mismo destino 3 o más veces en 10 minutos, horario 00:00–05:00) y clasifica en BAJO, MEDIO, ALTO o CRITICO. Las de riesgo auditable generan un evento de auditoría y una alerta.

**Operaciones programadas:** el heap se reconstruye desde MongoDB en cada lote y ejecuta solo las vencidas. Si una falla, queda pendiente con `ultimoError`; el campo `operacionProgramadaId` en la transacción evita duplicarla en un reintento. Admite recurrencia `NINGUNA`, `DIARIA`, `SEMANAL` y `MENSUAL`.

**Contraseñas:** PBKDF2-WithHmacSHA256, 120 000 iteraciones y sal aleatoria de 16 bytes (`PasswordService`).

## 6. API REST

Prefijo `/api`. Todas las respuestas usan `ApiResponse` (`success`, `message`, `data`, `error`), salvo los grafos y `usuarios-activos`, que devuelven el objeto directamente.

| Recurso | Endpoints |
|---|---|
| `/usuarios` | `POST /`, `GET /`, `GET /{id}`, `POST /login`, `PUT /{id}`, `PATCH /{id}/activo`, `DELETE /{id}`, `GET /puntos/rango`, `GET /top-puntos` |
| `/billeteras` | `POST /`, `GET /`, `GET /{id}`, `GET /usuario/{usuarioId}`, `PUT /{id}`, `GET /{id}/saldo`, `DELETE /{id}` |
| `/transacciones` | `POST /`, `POST /recargar`, `POST /retirar`, `POST /gastar`, `POST /transferir`, `GET /{id}`, `GET /billetera/{id}`, `GET /mayor-valor`, `GET /integridad`, `POST /{id}/revertir`, `POST /revertir-ultima` |
| `/programadas` | `POST /`, `GET /`, `GET /procesadas`, `POST /procesar` |
| `/recompensas` | `GET /beneficios`, `GET /{id}/puntos`, `GET /{id}/nivel`, `GET /{id}/resumen`, `GET /{id}/historial`, `GET /{id}/activos`, `POST /{id}/canjear/{beneficioId}` |
| `/notificaciones` | `GET /{usuarioId}`, `POST /{usuarioId}/despachar`, `PUT /{usuarioId}/{alertaId}/leer` |
| `/analitica` | `reporte/{id}`, `top-billeteras`, `usuarios-activos`, `auditoria/{id}`, `frecuencia-tipos`, `categorias-activas`, `patrones-gasto`, `monto-total`, `grafo/{id}`, `grafo-billeteras`, `gastos/{id}`, `transacciones-mayor-valor`, `rendimiento/{id}` |

## 7. Frontend (`ziplocSAS_Front/src`)

| Carpeta | Contenido |
|---|---|
| `pages` | `Dashboard`, `Billeteras`, `Transacciones`, `Recompensas`, `OperacionesProgramadas`, `Analitica`, `Notificaciones`, `Usuarios`, `SignalFlow`, `Login` |
| `components` | Tarjetas, formularios, `AnaliticaAvanzada` (grafos e integridad), `AIChat`, `NavBar`, `Sidebar`… |
| `hooks` | Hooks de react-query por módulo (`useTransacciones`, `useRecompensas`, `useAnalitica`…) |
| `services/api.js` | Funciones que llaman a la API REST |
| `api/axios.js` | Cliente HTTP, manejo de errores y token |
| `auth` | Contexto y almacenamiento de la sesión |
| `interfaces` | Tipos TypeScript de las respuestas |

## 8. Pruebas (`src/test/java/ZiplocSAS`)

| Clase | Qué comprueba |
|---|---|
| `domain/structures/ArbolFidelizacionTest` | Balance AVL con inserciones ordenadas; duplicados y actualización |
| `application/service/UsuarioServiceTest` | Email duplicado y normalizado, hash de contraseña, login, cambio de contraseña |
| `PlataformaWorkflowTests` | Transferencia con puntos y reversión, operaciones programadas por fecha, auditoría de riesgo crítico, puntos por tipo, grafo de gastos, canje de 100 pts y canje rechazado |
| `ProyectoFinalApplicationTests` | Carga del contexto de Spring |

## 9. Documentación adicional

- `Informe tecnico ZiplocSAS.pdf` y `Informe_Sustentacion_ZiplocSAS.pdf`: informes del proyecto.
- `CAMBIOS_APLICADOS.md`: lista de mejoras sobre la versión inicial.
- `ZIPLOC_SAS.md`: descripción general de la plataforma.
- Javadoc: `.\mvnw.cmd javadoc:javadoc`.

## 10. Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `npm` no se reconoce | Node.js no está instalado o la terminal se abrió antes de instalarlo; reiníciala |
| El backend no arranca y menciona Mongo | MongoDB no está encendido en `localhost:27017` |
| Las pruebas de Spring fallan por conexión | Igual: esas pruebas necesitan MongoDB |
| El navegador marca error de CORS | `CorsConfig` solo permite `http://localhost:5173`; si Vite usa otro puerto, agrégalo ahí |
