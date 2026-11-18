# FixMatch

Proyecto del Grupo 2 para solicitar presupuestos de gasfitería. El arrendatario registra una ficha de falla, elige un técnico y recibe un presupuesto con mano de obra, materiales, visita y exclusiones.

## Estado del repositorio

Aplicación web con Next.js, React, shadcn/ui y Postgres en Neon. Incluye el registro y revisión de la ficha de falla, hasta tres fotos, selección de técnico, envío y consulta de las fichas guardadas. Diseño en blanco y negro, pensado para celular.

El prototipo cubre el registro y envío de fichas (H1 y H2), la preparación y consulta de presupuestos (H3 y H4), la bandeja del técnico y las fotos de la ficha (H5 y H6), y la aceptación o rechazo del presupuesto (H7). Los envíos se guardan como datos de prueba en el prototipo.

## Probar el recorrido completo

1. Registrar una ficha y enviarla a uno de los técnicos de prueba. La ficha admite hasta tres fotos.
2. En el mismo navegador, abrir «Técnico» en la cabecera o `/presupuestos`. La bandeja ordena las fichas por fecha de envío. Al abrir una ficha se muestran su descripción y sus fotos.
3. Completar mano de obra, materiales, visita técnica y exclusiones. Los montos aceptan punto o coma decimal, hasta dos decimales y un cero explícito. Si no hay exclusiones, se puede escribir «Ninguna».
4. Volver a «Mis fichas» y abrir el presupuesto recibido. Revisar las cuatro partidas y el total, y elegir «Aceptar presupuesto» o «Rechazar presupuesto».

El modo técnico usa las fichas enviadas de la sesión actual. El cambio entre roles se simula en el mismo navegador.

La tabla `presupuestos` guarda los importes en céntimos, calcula el total y conserva una decisión por ficha. El arrendatario y el técnico ven el estado registrado al volver a abrir la ficha.

## Material de trabajo

- [Boceto de la lista de técnicos](docs/referencias/G2F-14_Boceto_lista_tecnicos.docx).
- [Pantallas de referencia de H2](docs/referencias/h2-lista-y-confirmacion.png).
- [Boceto de la ficha de falla](docs/referencias/h1-ficha-de-falla.png).
- [Plan del Sprint 1 del 10 de noviembre](docs/referencias/plan-sprint-1-10-11.pdf).
- [Alcance y criterios de H2](docs/h2-lista-y-envio.md).
- [Seis técnicos ficticios](datos/tecnicos.json).
- [Guía para colaborar](CONTRIBUTING.md).

Las asignaciones deben comprobarse en Jira: el plan del 10/11 y las capturas posteriores tienen diferencias, especialmente en G2F-12. Los documentos se conservan como referencia y no significan que sus tareas estén terminadas.

## Empezar a colaborar

```sh
git clone https://github.com/ronaljcb/fixmatch.git
cd fixmatch
git switch -c G2F-15-lista-envio
```

Cada integrante necesita acceso de escritura para subir su rama. Los cambios se proponen mediante pull requests hacia `main`, indicando la tarea de Jira y cómo se comprobaron.

## Ejecutar en tu computadora

Requiere Node.js 22 o superior y acceso a una base Postgres compatible con Neon.

```sh
npm ci
```

Copiar `.env.example` a `.env.local` y completar `DATABASE_URL`. Si tienes acceso al proyecto Vercel `fixmatch`, puedes obtener la configuración con `vercel env pull .env.local`. Nunca subir ese archivo al repositorio.

```sh
npm run db:setup
npm run dev
```

Abrir `http://localhost:3000`. La preparación crea las tablas y carga seis técnicos ficticios; puede repetirse sin borrar las fichas. Las migraciones SQL están en `db/`.

## Comprobar el flujo

Con el servidor local iniciado, en otra terminal:

```sh
npm run test:api
npm run test:browser
npm run test:presupuesto
npm run build
```

Las pruebas de navegador utilizan Chrome instalado. Cubren el envío, el detalle con fotos, los presupuestos y su estado después de recargar. Comprueban el ancho móvil a 320, 360, 390 y 430 píxeles. Las pruebas de API verifican validación, aislamiento de sesiones y solicitudes simultáneas. Las pruebas eliminan únicamente las fichas que crean.

## Datos y sesiones de prueba

La base guarda fichas y fotos reducidas en Postgres. Las fotos se convierten a WebP en el navegador, con un máximo de tres y 400 000 caracteres por imagen; se reservan para este prototipo pequeño. Los listados no descargan las fotos: se cargan al abrir la ficha.

Cada navegador recibe una cookie aleatoria HttpOnly que identifica su sesión durante 30 días. Las consultas solo devuelven fichas de esa sesión. Esto permite la demo sin login completo: otro navegador o dispositivo tiene sus propias fichas. No hay recuperación de la sesión si se borran las cookies ni identidad personal verificada. Usar información de prueba.

## Publicación

Vercel está conectado al repositorio y Neon está conectado al proyecto. `DATABASE_URL` se configura como variable del servidor; nunca se envía al navegador. Para generar un despliegue de prueba desde una rama:

```sh
vercel deploy --yes
```

El ambiente de pruebas debe tener las migraciones hasta `004-decision-presupuesto.sql`. Registra en Jira el resultado de la prueba independiente antes de cerrar cada historia.

## Objetivo de la demo

Según el plan adjunto: tres arrendatarios de prueba envían fichas y dos técnicos de prueba responden con las cuatro partidas completas. Cada recorrido debe tomar menos de diez minutos. Login completo, pagos y chat quedan fuera del alcance descrito.
