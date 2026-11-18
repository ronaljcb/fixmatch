import "./shadcn.css";
import "./globals.css";
import "./report.css";
import "./monochrome.css";

export const metadata = {
  title: "FixMatch · Encuentra tu técnico",
  description:
    "Elige un técnico de gasfitería y envía tu ficha para solicitar un presupuesto. Prototipo del Grupo 2.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
