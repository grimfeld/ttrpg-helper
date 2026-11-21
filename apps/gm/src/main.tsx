// Bootstrap only: mounts the main window or the Broadcast window. Logic belongs elsewhere.
import { createRoot } from "react-dom/client";
import { tauriRoot } from "./storage/tauriRoot";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root element");
createRoot(root).render(tauriRoot(location.search));
