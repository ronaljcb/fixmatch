"use client";

import { useState, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Droplets,
  Droplet,
  Gauge,
  Wrench,
  MapPin,
  Camera,
  X,
  Check,
  Pencil,
  Info,
  Bath,
  CookingPot,
  WashingMachine,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const types = [
  {
    id: "fuga",
    name: "Fuga",
    detail: "Agua corriendo o visible",
    icon: Droplets,
  },
  {
    id: "goteo",
    name: "Goteo",
    detail: "Grifo o junta que no cierra",
    icon: Droplet,
  },
  {
    id: "baja_presion",
    name: "Baja presión",
    detail: "Caudal escaso o intermitente",
    icon: Gauge,
  },
  {
    id: "atoro",
    name: "Atoro",
    detail: "Drenaje lento o rebalse",
    icon: Wrench,
  },
];
const places = [
  { name: "Cocina", icon: CookingPot },
  { name: "Baño", icon: Bath },
  { name: "Lavandería", icon: WashingMachine },
];
const districts = [
  "Santiago de Surco",
  "San Miguel",
  "Los Olivos",
  "Miraflores",
  "La Molina",
  "Lince",
  "Barranco",
  "San Borja",
  "Chorrillos",
  "Pueblo Libre",
  "Magdalena",
  "Jesús María",
  "San Isidro",
  "Surquillo",
  "Ate",
  "Santa Anita",
  "La Victoria",
  "San Martín de Porres",
  "Independencia",
  "Comas",
  "San Juan de Lurigancho",
  "San Juan de Miraflores",
  "Villa El Salvador",
  "Villa María del Triunfo",
  "Callao",
];

async function compress(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Usa fotos JPG, PNG o WebP.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Cada foto debe pesar menos de 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/webp", 0.78);
    if (data.length > 390000) data = canvas.toDataURL("image/webp", 0.45);
    if (data.length > 390000)
      throw new Error(
        "No se pudo reducir la foto. Prueba con otra más pequeña.",
      );
    return data;
  } finally {
    bitmap.close();
  }
}

export default function FailureForm({ onSave, busy, disabled }) {
  const [data, setData] = useState({
    tipoFalla: "",
    ubicacion: "",
    distrito: "",
    descripcion: "",
    fotos: [],
  });
  const [review, setReview] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);
  const formRef = useRef(null);
  const change = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  function validate(event) {
    event.preventDefault();
    const next = {};
    if (!data.tipoFalla) next.tipoFalla = "Selecciona un tipo de falla.";
    if (!data.ubicacion)
      next.ubicacion = "Selecciona dónde se encuentra el problema.";
    if (data.distrito.trim().length < 2)
      next.distrito = "Selecciona o escribe un distrito para continuar.";
    setErrors(next);
    if (Object.keys(next).length) {
      setTimeout(
        () => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(),
        0,
      );
      return;
    }
    setReview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function addPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length + data.fotos.length > 3) {
      setPhotoError("Puedes adjuntar hasta 3 fotos.");
      return;
    }
    setPhotoError("");
    setProcessing(true);
    try {
      const photos = await Promise.all(files.map(compress));
      setData((d) => ({ ...d, fotos: [...d.fotos, ...photos] }));
    } catch (e) {
      setPhotoError(e.message || "No se pudo leer la imagen.");
    } finally {
      setProcessing(false);
    }
  }
  const type = types.find((t) => t.id === data.tipoFalla);
  return (
    <div className="report-layout">
      <div>
        <div className="page-intro">
          <div className="eyebrow">
            {review ? "ANTES DE CONTINUAR" : "PASO 01 · TU FICHA DE FALLA"}
          </div>
          <h1>
            {review ? "Revisa los datos ingresados" : "Cuéntanos qué sucede"}
            <span>.</span>
          </h1>
          <p>
            {review
              ? "Tu reporte aún no ha sido enviado. Confirma los detalles antes de seleccionar al técnico."
              : "Describe el problema para solicitar un presupuesto al especialista que elijas."}
          </p>
        </div>
        {review ? (
          <>
            <Card className="review-card">
              <CardContent>
                <div className="review-heading">
                  <h2>Ficha de avería</h2>
                  <Button
                    variant="ghost"
                    onClick={() => setReview(false)}
                    disabled={busy}
                  >
                    <Pencil size={15} /> Editar datos
                  </Button>
                </div>
                <div className="review-type">
                  <span>
                    <Droplet size={26} />
                  </span>
                  <div>
                    <small>TIPO DE FALLA</small>
                    <h3>{type.name}</h3>
                    <p>{type.detail}</p>
                  </div>
                </div>
                <div className="review-pair">
                  <div>
                    <Bath size={24} />
                    <span>
                      <small>Lugar</small>
                      <strong>{data.ubicacion}</strong>
                    </span>
                  </div>
                  <div>
                    <MapPin size={24} />
                    <span>
                      <small>Distrito</small>
                      <strong>{data.distrito}</strong>
                    </span>
                  </div>
                </div>
                {data.descripcion && (
                  <div className="review-description">
                    <small>DETALLE AÑADIDO</small>
                    <p>{data.descripcion}</p>
                  </div>
                )}
                <div className="photos-title">
                  <h3>Fotos adjuntas</h3>
                  <Badge variant="secondary">
                    {data.fotos.length} de 3 fotos
                  </Badge>
                </div>
                {data.fotos.length ? (
                  <div className="photo-grid">
                    {data.fotos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={`Foto de la avería ${i + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="no-photos">
                    No adjuntaste fotos. Puedes continuar sin ellas.
                  </p>
                )}
              </CardContent>
            </Card>
            <Alert className="review-notice">
              <Info />
              <AlertTitle>Tu ficha todavía no ha sido enviada</AlertTitle>
              <AlertDescription>
                Al continuar guardaremos un borrador. Después podrás elegir un
                técnico y confirmar el envío.
              </AlertDescription>
            </Alert>
            <div className="report-actions">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                <ArrowLeft /> Volver a modificar
              </Button>
              <Button
                className="primary"
                disabled={busy || disabled}
                onClick={() => onSave(data)}
              >
                {busy ? "Guardando ficha…" : "Continuar a elegir técnico"}
                <ArrowRight />
              </Button>
            </div>
          </>
        ) : (
          <form
            ref={formRef}
            onSubmit={validate}
            noValidate
            className="report-form"
          >
            {!!Object.values(errors).filter(Boolean).length && (
              <Alert variant="destructive" className="validation-alert">
                <AlertCircle />
                <AlertTitle>Completa los datos requeridos</AlertTitle>
                <AlertDescription>
                  Revisa los campos señalados para continuar.
                </AlertDescription>
              </Alert>
            )}
            <fieldset
              disabled={busy || disabled || processing}
              className="problem-fieldset"
            >
              <legend>
                Tipo de falla <span>Selecciona una</span>
              </legend>
              <div className="problem-grid">
                {types.map((t) => (
                  <label
                    className={`problem-card ${data.tipoFalla === t.id ? "active" : ""}`}
                    key={t.id}
                  >
                    <input
                      type="radio"
                      aria-label={t.name}
                      name="tipoFalla"
                      value={t.id}
                      checked={data.tipoFalla === t.id}
                      onChange={() => change("tipoFalla", t.id)}
                      aria-invalid={!!errors.tipoFalla}
                      aria-describedby={
                        errors.tipoFalla ? "error-type" : undefined
                      }
                    />
                    <span className="problem-icon">
                      <t.icon size={25} />
                    </span>
                    <strong>{t.name}</strong>
                    <p>{t.detail}</p>
                    <span className="problem-check">
                      <Check size={14} />
                    </span>
                  </label>
                ))}
              </div>
              {errors.tipoFalla && (
                <p className="field-error" id="error-type">
                  {errors.tipoFalla}
                </p>
              )}
            </fieldset>
            <fieldset
              disabled={busy || disabled || processing}
              className="place-fieldset"
            >
              <legend>¿Dónde se encuentra?</legend>
              <div className="place-options">
                {places.map((p) => (
                  <label
                    className={`place-option ${data.ubicacion === p.name ? "active" : ""}`}
                    key={p.name}
                  >
                    <input
                      type="radio"
                      aria-label={p.name}
                      name="ubicacion"
                      value={p.name}
                      checked={data.ubicacion === p.name}
                      onChange={() => change("ubicacion", p.name)}
                      aria-invalid={!!errors.ubicacion}
                      aria-describedby={
                        errors.ubicacion ? "error-place" : undefined
                      }
                    />
                    <p.icon size={20} />
                    {p.name}
                    {data.ubicacion === p.name && <Check size={15} />}
                  </label>
                ))}
              </div>
              {errors.ubicacion && (
                <p className="field-error" id="error-place">
                  {errors.ubicacion}
                </p>
              )}
            </fieldset>
            <div className="district-field">
              <div className="field-heading">
                <Label htmlFor="distrito">
                  Distrito <span>*</span>
                </Label>
                <span>Lima Metropolitana</span>
              </div>
              <div className="district-input">
                <MapPin size={19} />
                <Input
                  id="distrito"
                  name="distrito"
                  list="district-list"
                  placeholder="Selecciona o escribe tu distrito"
                  value={data.distrito}
                  onChange={(e) => change("distrito", e.target.value)}
                  maxLength={80}
                  aria-invalid={!!errors.distrito}
                  aria-describedby={
                    errors.distrito ? "error-district" : undefined
                  }
                  disabled={busy || disabled}
                />
                <datalist id="district-list">
                  {districts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </datalist>
              </div>
              {errors.distrito && (
                <p className="field-error" id="error-district">
                  {errors.distrito}
                </p>
              )}
            </div>
            <div className="photo-field">
              <div className="photos-title">
                <h2>Fotos de la avería</h2>
                <Badge variant="secondary">{data.fotos.length}/3</Badge>
              </div>
              <p>Opcional. Hasta 3 fotos claras del problema.</p>
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={addPhotos}
                disabled={processing || busy || disabled}
                aria-label="Adjuntar fotos de la avería"
              />
              <div className="photo-grid">
                {data.fotos.map((photo, i) => (
                  <div className="photo-preview" key={i}>
                    <img src={photo} alt={`Foto de la avería ${i + 1}`} />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label={`Quitar foto ${i + 1}`}
                      onClick={() =>
                        change(
                          "fotos",
                          data.fotos.filter((_, index) => index !== i),
                        )
                      }
                      disabled={processing || busy}
                    >
                      <X size={15} />
                    </Button>
                    <span>
                      <Check size={12} /> {i + 1}/3
                    </span>
                  </div>
                ))}
                {data.fotos.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="photo-add"
                    onClick={() => fileRef.current?.click()}
                    disabled={processing || busy || disabled}
                  >
                    <Camera size={25} />
                    <span>{processing ? "Preparando…" : "Añadir foto"}</span>
                  </Button>
                )}
              </div>
              {photoError && (
                <p role="alert" className="field-error">
                  {photoError}
                </p>
              )}
            </div>
            <div className="detail-field">
              <Label htmlFor="descripcion">
                Detalle adicional <span className="optional">Opcional</span>
              </Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                rows={4}
                maxLength={500}
                placeholder="Ej. El agua se filtra por la base del grifo desde ayer por la tarde."
                value={data.descripcion}
                onChange={(e) => change("descripcion", e.target.value)}
                disabled={busy || disabled}
              />
              <small>{data.descripcion.length}/500 caracteres</small>
            </div>
            <div className="report-actions">
              <span>No se enviará hasta que elijas un técnico.</span>
              <Button
                className="primary"
                type="submit"
                disabled={busy || disabled || processing}
              >
                Revisar ficha
                <ArrowRight />
              </Button>
            </div>
          </form>
        )}
      </div>
      <aside className="report-aside">
        <div className="aside-illustration">
          <Wrench size={50} />
          <span>
            <Check size={18} />
          </span>
        </div>
        <div className="eyebrow">CADA DETALLE AYUDA</div>
        <h2>
          Una ficha clara.
          <br />
          Un mejor presupuesto.
        </h2>
        <p>
          El técnico podrá entender qué sucede antes de preparar su propuesta.
        </p>
        <ol>
          <li>
            <b>01</b>
            <div>
              <strong>Describe la avería</strong>
              <p>El tipo de falla y dónde ocurre.</p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <strong>Revisa los detalles</strong>
              <p>Puedes corregirlos antes de continuar.</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <strong>Elige y envía</strong>
              <p>Tú decides a qué técnico enviar tu ficha.</p>
            </div>
          </li>
        </ol>
        <div className="aside-demo">
          <Info size={17} />
          <p>Estás en una versión de prueba. Usa datos y fotos de ejemplo.</p>
        </div>
      </aside>
    </div>
  );
}
