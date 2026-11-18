# Trabajo en equipo

## Antes de empezar

Revisar en Jira el responsable, los criterios y las dependencias de la tarea. Acordar con el equipo la tecnología y la forma de compartir las fichas entre las pantallas antes de construir módulos separados.

## Ramas y revisión

`main` contiene el trabajo integrado. Crear una rama por tarea con un nombre claro, por ejemplo `G2F-15-lista-envio`, `G2F-18-formulario-presupuesto` o `G2F-20-vista-presupuesto`.

```sh
git switch main
git pull --ff-only
git switch -c G2F-15-lista-envio
```

Hacer cambios relacionados con esa tarea, subir la rama y abrir un pull request. Pedir que otro integrante revise el resultado antes de integrarlo. Esta es una convención del equipo; no se ha configurado una regla obligatoria de protección de ramas.

## Commits

Describir lo que cambió con frases concretas y naturales. Incluir la clave de Jira cuando corresponda, sin firmas automáticas ni prefijos de herramientas.

- `G2F-15: agrego la lista de técnicos y la selección`
- `G2F-15: guardo el envío y muestro la confirmación`
- `G2F-15: evito enviar dos veces la misma ficha`

No subir contraseñas, tokens, archivos `.env`, dependencias instaladas ni datos personales reales. Usar los perfiles ficticios para las pruebas.

## Comprobar y entregar

Explicar en el pull request cómo probar el cambio y qué falta. Quien construye no da por aprobada la prueba asignada a otro compañero. Adjuntar en Jira el enlace al cambio y registrar allí el avance real; crear un repositorio o subir código no equivale a cerrar una historia.
