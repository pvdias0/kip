import { createRoot } from "react-dom/client";
// Fontes auto-hospedadas (subset latin, cobre portugues). Evita a cadeia
// render-blocking CSS -> fonts.googleapis.com -> fonts.gstatic.com.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
