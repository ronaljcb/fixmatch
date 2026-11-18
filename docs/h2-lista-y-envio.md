# H2 Elegir técnico y enviar la ficha

Referencia: historia G2F-4, boceto G2F-14 de Gabriel y construcción G2F-15 de Ronal. Este documento resume el boceto adjunto; no acredita una implementación terminada.

## Comportamiento esperado

La pantalla inicial recibe una ficha en estado `Borrador` y muestra su tipo de falla, ubicación y distrito. Cada técnico aparece con nombre, distrito y especialidad. Se puede seleccionar un solo técnico y el botón de envío permanece deshabilitado mientras no haya selección.

Al enviar, se guarda en la ficha `estado = "Enviada"`, `tecnicoId` y `fechaEnvio`. La confirmación muestra el número de ficha, el técnico elegido, la fecha y el estado. El botón «Ver mis fichas» lleva a la lista donde debe verse el mismo estado.

## Criterios de aceptación

1. La lista muestra nombre, distrito y especialidad de cada técnico, sin campos vacíos.
2. Al enviar, la ficha queda en estado «Enviada».

## Casos de prueba del boceto

- Comprobar los seis técnicos de `datos/tecnicos.json`.
- Elegir TEC-01 y enviar una ficha en Borrador.
- Comprobar el técnico y el estado tanto en la confirmación como en la lista de fichas.
- Intentar reenviar la misma ficha: debe impedirse.
- Si falla el guardado, mostrar «No se pudo enviar, intenta de nuevo» y conservar Borrador.

Los filtros por distrito y especialidad son opcionales. Si se implementan, deben permitir quitar los filtros y explicar cuando no haya resultados.

## Integración pendiente

El equipo debe acordar el modelo completo de ficha, el almacenamiento y la navegación con H1 y H4. El boceto especifica los campos que cambian al enviar, pero no impone un framework ni una base de datos. Los datos ficticios no implican un envío real a una persona.

G2F-16 corresponde a la prueba de H2 por otro integrante. G2F-22 es la prueba de H4 y depende de la vista de presupuesto G2F-20; no forma parte de la construcción de H2.
