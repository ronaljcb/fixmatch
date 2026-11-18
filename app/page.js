"use client";

import { useEffect, useRef, useState } from "react";
import FailureForm from "@/components/failure-form";
import { Button } from "@/components/ui/button";

const fallas = {
  fuga: "Fuga de agua",
  goteo: "Goteo",
  baja_presion: "Baja presión",
  atoro: "Atoro",
};

const numero = (f) => `FM-${String(f.numero).padStart(4, "0")}`;
const fecha = (value) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));

function Icon({ name, size = 20, ...props }) {
  const paths = {
    wrench: (
      <>
        <path d="m14 6 4 4 3-3a7 7 0 0 1-9 9l-6 6-4-4 6-6a7 7 0 0 1 9-9z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    file: (
      <>
        <path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    drop: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

async function api(path, body, signal) {
  const response = await fetch(path, {
    signal,
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("No se pudo conectar. Intenta de nuevo.");
  }
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}

export default function Home() {
  const [view, setView] = useState("new");
  const [tecnicos, setTecnicos] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [selected, setSelected] = useState("");
  const [distrito, setDistrito] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef(null);
  const inFlight = useRef(false);

  async function load(signal) {
    setLoading(true);
    setError("");
    try {
      const [ts, fs] = await Promise.all([
        api("/api/tecnicos", undefined, signal),
        api("/api/fichas", undefined, signal),
      ]);
      setTecnicos(ts);
      setFichas(fs);
      if (fs.length) setView("list");
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!loading) heading.current?.focus();
  }, [view, loading]);

  function navigate(next) {
    setError("");
    setView(next);
  }
  async function open(f) {
    setError("");
    try {
      f = await api(`/api/fichas/${f.id}`);
    } catch (e) {
      setError(e.message);
      return;
    }
    setFicha(f);
    setSelected("");
    setDistrito("");
    setEspecialidad("");
    navigate(f.estado === "Borrador" ? "choose" : "success");
  }
  async function create(data) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const f = await api("/api/fichas", data);
      setFichas((previous) => [f, ...previous]);
      setFicha(f);
      setSelected("");
      setDistrito("");
      setEspecialidad("");
      setView("choose");
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function send() {
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const f = await api(`/api/fichas/${ficha.id}/enviar`, {
        tecnicoId: selected,
      });
      setFicha({ ...f, fotos: ficha.fotos });
      setFichas((previous) =>
        previous.map((item) => (item.id === f.id ? f : item)),
      );
      setView("success");
    } catch (e) {
      setError(e.message);
      // Recupera el estado real si el servidor guardó pero se perdió la respuesta.
      try {
        const fs = await api("/api/fichas");
        setFichas(fs);
        const saved = fs.find((item) => item.id === ficha.id);
        if (saved?.estado === "Enviada") {
          setFicha({ ...saved, fotos: ficha.fotos });
          setView("success");
          setError("");
        }
      } catch {
        /* Se mantiene el error y el borrador para reintentar. */
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const chosen = tecnicos.find((t) => t.id === selected);
  const filtered = tecnicos.filter(
    (t) =>
      (!distrito || t.distrito === distrito) &&
      (!especialidad || t.especialidad === especialidad),
  );

  return (
    <>
      <header className="header">
        <div className="nav-wrap">
          <a className="brand" href="/" aria-label="FixMatch, inicio">
            <span className="brand-icon">
              <Icon name="wrench" size={23} />
            </span>
            Fix<span>Match</span>
            <i />
          </a>
          <nav aria-label="Navegación principal">
            <button
              className={view === "list" ? "nav-active" : ""}
              onClick={() => navigate("list")}
              disabled={busy}
            >
              <Icon name="file" size={17} /> Mis fichas{" "}
              <span className="count">{fichas.length}</span>
            </button>
            <span className="nav-line" />
            <span className="demo-label">
              <span /> Versión de prueba
            </span>
            <span className="profile" title="Sesión de prueba">
              R
            </span>
          </nav>
        </div>
      </header>
      <main className="main">
        <div className="breadcrumb">
          INICIO <span>/</span> SOLICITUD DE SERVICIO
        </div>
        {loading ? (
          <div className="loading" role="status">
            <span className="spinner" /> Preparando tu espacio…
          </div>
        ) : (
          <>
            {view !== "list" && (
              <ol className="steps" aria-label="Progreso de la solicitud">
                {["Tu ficha", "Elige técnico", "Confirmación"].map((s, i) => {
                  const step = view === "new" ? 0 : view === "choose" ? 1 : 2;
                  return (
                    <li
                      key={s}
                      className={
                        i === step ? "current" : i < step ? "complete" : ""
                      }
                      aria-current={i === step ? "step" : undefined}
                    >
                      <span>
                        {i < step ? (
                          <Icon name="check" size={14} />
                        ) : (
                          `0${i + 1}`
                        )}
                      </span>
                      {s}
                    </li>
                  );
                })}
              </ol>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
                {!tecnicos.length && (
                  <button onClick={() => load()}>Reintentar</button>
                )}
              </div>
            )}
            {view === "new" && (
              <FailureForm
                onSave={create}
                busy={busy}
                disabled={!tecnicos.length}
              />
            )}
            {view === "choose" && ficha && (
              <>
                <div className="page-intro">
                  <div className="eyebrow">
                    EL SIGUIENTE PASO, EN BUENAS MANOS
                  </div>
                  <h1 ref={heading} tabIndex={-1}>
                    Encuentra al técnico indicado<span>.</span>
                  </h1>
                  <p>
                    Elige un especialista y envíale tu ficha para solicitar un
                    presupuesto.
                  </p>
                </div>
                <div className="layout choose-layout">
                  <section>
                    <div className="list-heading">
                      <h2>
                        Técnicos de gasfitería <span>{filtered.length}</span>
                      </h2>
                      <span className="muted">Perfiles de prueba</span>
                    </div>
                    <div className="filters">
                      <label>
                        <Icon name="pin" size={17} />
                        <span className="sr-only">Filtrar por distrito</span>
                        <select
                          value={distrito}
                          onChange={(e) => setDistrito(e.target.value)}
                          disabled={busy}
                        >
                          <option value="">Todos los distritos</option>
                          {[...new Set(tecnicos.map((t) => t.distrito))].map(
                            (x) => (
                              <option key={x}>{x}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        <Icon name="wrench" size={17} />
                        <span className="sr-only">
                          Filtrar por especialidad
                        </span>
                        <select
                          value={especialidad}
                          onChange={(e) => setEspecialidad(e.target.value)}
                          disabled={busy}
                        >
                          <option value="">Todas las especialidades</option>
                          {[
                            ...new Set(tecnicos.map((t) => t.especialidad)),
                          ].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <fieldset className="technicians" disabled={busy}>
                      <legend className="sr-only">Selecciona un técnico</legend>
                      {filtered.map((t, i) => (
                        <label
                          className={`tech-card ${selected === t.id ? "selected" : ""}`}
                          key={t.id}
                        >
                          <span className={`avatar tone-${i % 3}`}>
                            {t.nombre
                              .split(" ")
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span className="tech-info">
                            <strong>{t.nombre}</strong>
                            <span className="tech-place">
                              <Icon name="pin" size={13} />
                              <span className="sr-only">Distrito: </span>
                              {t.distrito}
                            </span>
                            <span className="specialty">{t.especialidad}</span>
                          </span>
                          <input
                            type="radio"
                            name="tecnico"
                            value={t.id}
                            checked={selected === t.id}
                            onChange={() => setSelected(t.id)}
                          />
                          <span className="radio-art">
                            <Icon name="check" size={13} />
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    {!filtered.length && (
                      <div className="empty">
                        <Icon name="wrench" size={30} />
                        <h3>No hay técnicos para este filtro</h3>
                        <button
                          className="text-button"
                          onClick={() => {
                            setDistrito("");
                            setEspecialidad("");
                          }}
                        >
                          Quitar filtros
                        </button>
                      </div>
                    )}
                  </section>
                  <aside className="summary panel">
                    <div className="summary-top">
                      <Icon name="file" />
                      <span>RESUMEN DE TU FICHA</span>
                    </div>
                    <div className="summary-number">
                      {numero(ficha)}
                      <span className="badge draft">Borrador</span>
                    </div>
                    <h2>{fallas[ficha.tipoFalla]}</h2>
                    <p className="location">
                      {ficha.ubicacion} · {ficha.distrito}
                    </p>
                    {ficha.descripcion && (
                      <p className="description">{ficha.descripcion}</p>
                    )}
                    <div className="aside-rule" />
                    <div className="summary-caption">TÉCNICO SELECCIONADO</div>
                    {chosen ? (
                      <div className="chosen">
                        <span className="small-check">
                          <Icon name="check" size={14} />
                        </span>
                        <div>
                          <strong>{chosen.nombre}</strong>
                          <p>{chosen.especialidad}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="no-choice">
                        Selecciona un técnico de la lista para continuar.
                      </p>
                    )}
                    <Button
                      className="primary"
                      disabled={!selected || busy}
                      onClick={send}
                    >
                      {busy
                        ? "Enviando ficha…"
                        : chosen
                          ? `Enviar ficha a ${chosen.nombre.split(" ")[0]}`
                          : "Selecciona un técnico"}
                      <Icon name="arrow" size={17} />
                    </Button>
                    <p className="send-hint">
                      Al enviar, tu ficha quedará en estado «Enviada».
                    </p>
                    <button
                      className="text-button"
                      onClick={() => navigate("list")}
                      disabled={busy}
                    >
                      Guardar para después
                    </button>
                  </aside>
                </div>
              </>
            )}
            {view === "success" && ficha && (
              <section className="success panel">
                <div className="success-icon">
                  <Icon name="check" size={37} />
                </div>
                <div className="eyebrow">SOLICITUD REGISTRADA</div>
                <h1 ref={heading} tabIndex={-1}>
                  ¡Ficha enviada!
                </h1>
                <p>
                  Tu ficha se guardó para <strong>{ficha.tecnicoNombre}</strong>
                  .
                </p>
                <p className="muted">
                  Puedes consultar el envío en Mis fichas.
                </p>
                <dl className="receipt">
                  <div>
                    <dt>Número de ficha</dt>
                    <dd>{numero(ficha)}</dd>
                  </div>
                  <div>
                    <dt>Técnico</dt>
                    <dd>{ficha.tecnicoNombre}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      <span className="badge sent">
                        <Icon name="check" size={12} /> Enviada
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha de envío</dt>
                    <dd>{fecha(ficha.fechaEnvio)}</dd>
                  </div>
                </dl>
                <Button className="primary" onClick={() => navigate("list")}>
                  Ver mis fichas
                  <Icon name="arrow" size={17} />
                </Button>
                <div className="receipt-photos">
                  {ficha.fotos?.map((photo, i) => (
                    <img
                      src={photo}
                      key={i}
                      alt={`Foto guardada de la avería ${i + 1}`}
                    />
                  ))}
                </div>
                <p className="demo-note">
                  Envío de prueba. No se contacta a personas reales.
                </p>
              </section>
            )}
            {view === "list" && (
              <>
                <div className="page-intro list-intro">
                  <div>
                    <div className="eyebrow">TODO EN UN SOLO LUGAR</div>
                    <h1 ref={heading} tabIndex={-1}>
                      Mis fichas<span>.</span>
                    </h1>
                    <p>Revisa tus envíos o continúa una solicitud pendiente.</p>
                  </div>
                  <Button className="primary" onClick={() => navigate("new")}>
                    <Icon name="plus" size={17} /> Nueva ficha
                  </Button>
                </div>
                {!fichas.length ? (
                  <section className="empty panel">
                    <span className="empty-icon">
                      <Icon name="file" size={30} />
                    </span>
                    <h2>Tu primera solución empieza con una ficha</h2>
                    <p>
                      Cuéntanos qué falla y elige a quién enviar tu solicitud.
                    </p>
                    <Button className="primary" onClick={() => navigate("new")}>
                      Crear mi primera ficha
                      <Icon name="arrow" size={17} />
                    </Button>
                  </section>
                ) : (
                  <div className="fichas-grid">
                    {fichas.map((f) => (
                      <article className="ficha-card panel" key={f.id}>
                        <div className="ficha-top">
                          <span>{numero(f)}</span>
                          <span
                            className={`badge ${f.estado === "Enviada" ? "sent" : "draft"}`}
                          >
                            {f.estado === "Enviada" && (
                              <Icon name="check" size={12} />
                            )}
                            {f.estado}
                          </span>
                        </div>
                        <div className="ficha-symbol">
                          <Icon name="drop" size={25} />
                        </div>
                        <h2>{fallas[f.tipoFalla]}</h2>
                        <p className="location">
                          {f.ubicacion} · {f.distrito}
                        </p>
                        <div className="ficha-person">
                          {f.tecnicoNombre || "Sin técnico seleccionado"}
                        </div>
                        <div className="ficha-bottom">
                          <span>
                            <Icon name="clock" size={13} />
                            {new Intl.DateTimeFormat("es-PE", {
                              dateStyle: "medium",
                              timeZone: "America/Lima",
                            }).format(new Date(f.fechaCreacion))}
                          </span>
                          <button
                            className="text-button"
                            onClick={() => open(f)}
                          >
                            {f.estado === "Borrador"
                              ? "Elegir técnico"
                              : "Ver envío"}
                            <Icon name="arrow" size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <p className="session-note">
                  Estas fichas pertenecen a tu sesión de prueba en este
                  navegador. Se conservan al recargar.
                </p>
              </>
            )}
          </>
        )}
      </main>
      <footer>
        <span className="footer-brand">
          FixMatch<span> — Menos vueltas. Más soluciones.</span>
        </span>
        <span>
          Versión de prueba
        </span>
      </footer>
    </>
  );
}
