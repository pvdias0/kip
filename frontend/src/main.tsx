import { createRoot } from "react-dom/client";
// Fontes auto-hospedadas e variaveis: 1 arquivo por familia cobre todos os pesos
// (o navegador so baixa o subset latin, via unicode-range).
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/outfit/wght.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
