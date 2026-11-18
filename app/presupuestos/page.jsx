"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Info,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  partidas,
  centimos,
  soles,
  validarPresupuesto,
} from "@/lib/presupuesto";
import "./presupuesto.css";

const tipos = {
  fuga: "Fuga",
  goteo: "Goteo",
  baja_presion: "Baja presión",
  atoro: "Atoro",
};
const numero = (f) => `FM-${String(f.numero).padStart(4, "0")}`;
const initial = { manoObra: "", materiales: "", visita: "", exclusiones: "" };
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
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "No se pudo completar la operación."),
      { fields: data.fields },
    );
  return data;
}

export default function Presupuestos() {
  const [fichas, setFichas] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const form = useRef(null);
  const title = useRef(null);
  async function load(signal) {
    setLoading(true);
    setError("");
    try {
      setFichas(await api("/api/presupuestos", undefined, signal));
    } catch (e) {
      if (!signal?.aborted)
        setError("No se pudo cargar la lista. Intenta de nuevo.");
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
    title.current?.focus();
    window.scrollTo(0, 0);
  }, [ficha, saved]);
  function open(f) {
    setFicha(f);
    setSaved(f.presupuesto);
    setError("");
    setErrors({});
    setData(
      f.presupuesto
        ? {
            ...Object.fromEntries(
              partidas.map((p) => [
                p.key,
                (f.presupuesto[p.key] / 100).toFixed(2),
              ]),
            ),
            exclusiones: f.presupuesto.exclusiones,
          }
        : initial,
    );
  }
  function change(key, value) {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    const next = validarPresupuesto(data);
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      form.current?.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await api(`/api/fichas/${ficha.id}/presupuesto`, data);
      setSaved(result);
      setFichas((fs) =>
        fs.map((f) => (f.id === ficha.id ? { ...f, presupuesto: result } : f)),
      );
    } catch (e) {
      setError(
        e.message ||
          "No se pudo enviar. Tus datos siguen aquí para reintentar.",
      );
      if (e.fields) setErrors(e.fields);
      // Recupera un envío guardado cuya respuesta se perdió en la red.
      try {
        const fs = await api("/api/presupuestos");
        setFichas(fs);
        const result = fs.find((f) => f.id === ficha.id)?.presupuesto;
        if (result) {
          setSaved(result);
          setData({
            ...Object.fromEntries(
              partidas.map((p) => [p.key, (result[p.key] / 100).toFixed(2)]),
            ),
            exclusiones: result.exclusiones,
          });
          setError("");
        }
      } catch {
        /* Mantiene los datos del formulario y el error. */
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const total =
    saved?.total ??
    partidas.reduce((sum, p) => sum + (centimos(data[p.key]) ?? 0), 0);
  const invalidCount = Object.values(errors).filter(Boolean).length;
  return (
    <>
      <header className="header">
        <div className="nav-wrap">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Wrench size={20} />
            </span>
            Fix<span>Match</span>
          </Link>
          <nav>
            <Link href="/" className="budget-home">
              <ArrowLeft size={15} /> Mis fichas
            </Link>
          </nav>
        </div>
      </header>
      <main className="main budget-main">
        <div className="budget-mode">
          <Info size={15} />
          <span>Modo técnico de prueba · Fichas de este navegador</span>
        </div>
        {ficha && (
          <Button
            variant="ghost"
            className="budget-back"
            disabled={busy}
            onClick={() => {
              setFicha(null);
              setError("");
            }}
          >
            <ArrowLeft /> Volver a las fichas
          </Button>
        )}
        <div className="page-intro">
          <div className="eyebrow">
            {ficha ? `PRESUPUESTO · ${numero(ficha)}` : "PRESUPUESTOS"}
          </div>
          <h1 ref={title} tabIndex={-1}>
            {saved && ficha
              ? "Presupuesto enviado"
              : ficha
                ? "Enviar presupuesto"
                : "Fichas para presupuestar"}
            <span>.</span>
          </h1>
          <p>
            {ficha
              ? `${tipos[ficha.tipoFalla]} · ${ficha.ubicacion} · ${ficha.distrito}`
              : "Prepara las cuatro partidas para una ficha enviada al técnico."}
          </p>
          {ficha && (
            <p className="budget-technician">
              Técnico: <strong>{ficha.tecnicoNombre}</strong>
            </p>
          )}
        </div>
        {error && (
          <Alert role="alert" className="budget-error">
            <Info />
            <AlertTitle>No se pudo completar la operación</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            {!ficha && (
              <Button variant="outline" onClick={() => load()}>
                Reintentar
              </Button>
            )}
          </Alert>
        )}
        {loading ? (
          <p role="status" className="loading">
            Cargando fichas…
          </p>
        ) : !ficha ? (
          <>
            {!fichas.length && !error && (
              <Card className="budget-empty">
                <CardContent>
                  <FileText size={30} />
                  <h2>No hay fichas enviadas en esta sesión</h2>
                  <p>
                    Primero registra una falla y envíala a un técnico. Luego
                    vuelve aquí desde el mismo navegador.
                  </p>
                  <Button asChild className="primary">
                    <Link href="/">
                      Crear una ficha
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="budget-list">
              {fichas.map((f) => (
                <Card key={f.id} className="budget-item">
                  <CardContent>
                    <div className="budget-item-top">
                      <span>{numero(f)}</span>
                      <span className="badge">
                        {f.presupuesto ? "Presupuesto enviado" : "Pendiente"}
                      </span>
                    </div>
                    <h2>
                      {tipos[f.tipoFalla]} · {f.ubicacion}
                    </h2>
                    <p>{f.distrito}</p>
                    <p>Técnico: {f.tecnicoNombre}</p>
                    {f.presupuesto && (
                      <strong>{soles(f.presupuesto.total)}</strong>
                    )}
                    <Button variant="outline" onClick={() => open(f)}>
                      {f.presupuesto
                        ? "Ver presupuesto"
                        : "Preparar presupuesto"}
                      <ArrowRight size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            {saved && (
              <Alert className="budget-success" role="status">
                <Check />
                <AlertTitle>El presupuesto quedó guardado</AlertTitle>
                <AlertDescription>
                  Las cuatro partidas y el total están registrados para{" "}
                  {numero(ficha)}. Este envío de prueba no contacta a personas
                  reales.
                </AlertDescription>
              </Alert>
            )}
            {!!invalidCount && (
              <Alert className="budget-error" role="alert">
                <Info />
                <AlertTitle>
                  No se puede enviar: revisa {invalidCount}{" "}
                  {invalidCount === 1 ? "partida" : "partidas"}.
                </AlertTitle>
                <AlertDescription>
                  Completa los campos marcados. El número 0 es válido si no hay
                  costo en una partida.
                </AlertDescription>
              </Alert>
            )}
            <form
              onSubmit={submit}
              noValidate
              ref={form}
              className="budget-layout"
            >
              <Card className="budget-form">
                <CardContent>
                  <fieldset disabled={busy || !!saved}>
                    <legend className="sr-only">
                      Cuatro partidas del presupuesto
                    </legend>
                    {partidas.map((p, i) => (
                      <div className="budget-field" key={p.key}>
                        <div className="budget-label">
                          <Label htmlFor={p.key}>
                            {i + 1}. {p.label}
                          </Label>
                          <span>Obligatorio</span>
                        </div>
                        <div className="money-input">
                          <span>S/</span>
                          <Input
                            id={p.key}
                            name={p.key}
                            type="text"
                            inputMode="decimal"
                            maxLength={11}
                            autoComplete="off"
                            placeholder="0.00"
                            value={data[p.key]}
                            onChange={(e) => change(p.key, e.target.value)}
                            aria-invalid={!!errors[p.key]}
                            aria-describedby={
                              errors[p.key] ? `${p.key}-error` : undefined
                            }
                          />
                        </div>
                        {errors[p.key] && (
                          <p
                            className="budget-field-error"
                            id={`${p.key}-error`}
                          >
                            {errors[p.key]}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="budget-field">
                      <div className="budget-label">
                        <Label htmlFor="exclusiones">4. Exclusiones</Label>
                        <span>Obligatorio</span>
                      </div>
                      <p className="budget-field-hint">
                        ¿Qué no incluye este precio?
                      </p>
                      <Textarea
                        id="exclusiones"
                        name="exclusiones"
                        rows={4}
                        maxLength={1000}
                        placeholder="Ej. No incluye pintura ni retiro de escombros."
                        value={data.exclusiones}
                        onChange={(e) => change("exclusiones", e.target.value)}
                        aria-invalid={!!errors.exclusiones}
                        aria-describedby={
                          errors.exclusiones ? "exclusiones-error" : undefined
                        }
                      />
                      {errors.exclusiones && (
                        <p
                          className="budget-field-error"
                          id="exclusiones-error"
                        >
                          {errors.exclusiones}
                        </p>
                      )}
                    </div>
                  </fieldset>
                </CardContent>
              </Card>
              <aside className="budget-summary">
                <h2>Resumen del presupuesto</h2>
                <dl>
                  {partidas.map((p) => (
                    <div key={p.key}>
                      <dt>{p.label}</dt>
                      <dd>
                        {soles(
                          saved ? saved[p.key] : (centimos(data[p.key]) ?? 0),
                        )}
                      </dd>
                    </div>
                  ))}
                  <div className="budget-total">
                    <dt>Total</dt>
                    <dd data-testid="presupuesto-total" aria-live="polite">
                      {soles(total)}
                    </dd>
                  </div>
                </dl>
                <div className="budget-exclusions">
                  <h3>EXCLUSIONES</h3>
                  <p>
                    {saved?.exclusiones ||
                      data.exclusiones.trim() ||
                      "Aún sin completar."}
                  </p>
                </div>
                <p className="budget-calc-note">
                  El total suma mano de obra, materiales y visita. Las
                  exclusiones describen lo que queda fuera.
                </p>
              </aside>
              <div className="budget-actions">
                {!saved && (
                  <Button type="submit" className="primary" disabled={busy}>
                    {busy ? "Enviando presupuesto…" : "Enviar presupuesto"}
                    <ArrowRight />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setFicha(null);
                    setError("");
                  }}
                >
                  {saved ? "Volver a las fichas" : "Cancelar"}
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
      <footer>
        <span className="footer-brand">FixMatch</span>
        <span>Versión de prueba</span>
      </footer>
    </>
  );
}
