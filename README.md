# FixMatch

Proyecto del Grupo 2 para solicitar presupuestos de gasfitería. El arrendatario registra una ficha de falla, elige un técnico y recibe un presupuesto con mano de obra, materiales, visita y exclusiones.

## Estado del repositorio

Este repositorio reúne la documentación inicial y los datos de prueba del Sprint 1. La aplicación todavía no está implementada y no hay comandos de instalación o ejecución. El equipo debe acordar la tecnología antes de agregar el código.

## Material de trabajo

- [Boceto de la lista de técnicos](docs/referencias/G2F-14_Boceto_lista_tecnicos.docx).
- [Pantallas de referencia de H2](docs/referencias/h2-lista-y-confirmacion.png).
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

## Objetivo de la demo

Según el plan adjunto: tres arrendatarios de prueba envían fichas y dos técnicos de prueba responden con las cuatro partidas completas. Cada recorrido debe tomar menos de diez minutos. Login completo, pagos y chat quedan fuera del alcance descrito.
