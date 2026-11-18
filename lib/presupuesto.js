export const partidas = [
  { key: "manoObra", label: "Mano de obra" },
  { key: "materiales", label: "Materiales" },
  { key: "visita", label: "Visita técnica" },
];

// Los importes se guardan y suman en céntimos para evitar errores decimales.
export function centimos(value) {
  if (
    typeof value !== "string" ||
    !/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value.trim())
  )
    return null;
  const [entero, decimal = ""] = value.trim().replace(",", ".").split(".");
  const amount = Number(entero) * 100 + Number(decimal.padEnd(2, "0"));
  return amount <= 100000000 ? amount : null;
}

export function validarPresupuesto(data) {
  const errors = {};
  for (const { key } of partidas) {
    if (!data || typeof data[key] !== "string" || !data[key].trim())
      errors[key] = "Completa este monto. Escribe 0 si no corresponde.";
    else if (centimos(data[key]) === null)
      errors[key] = "Usa un monto de 0 a 1 000 000, con hasta dos decimales.";
  }
  if (!data || typeof data.exclusiones !== "string" || !data.exclusiones.trim())
    errors.exclusiones =
      "Indica qué no incluye el precio. Si no hay exclusiones, escribe «Ninguna».";
  else if (data.exclusiones.trim().length > 1000)
    errors.exclusiones = "Las exclusiones admiten hasta 1000 caracteres.";
  return errors;
}

export function soles(amount) {
  return `S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)}`;
}
