// Bootstrap only: mounts the root component on Tauri's Platform. Logic belongs in App or Core.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { tauriPlatform } from "./storage/tauriPlatform";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root element");
createRoot(root).render(
  <StrictMode>
    <App platform={tauriPlatform} />
  </StrictMode>
);
