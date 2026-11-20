// Bootstrap only: mounts the root component on the app data folder. Logic belongs in App or Core.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { tauriFileSystem } from "./storage/tauriFileSystem";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root element");
const newId = () => crypto.randomUUID();
createRoot(root).render(
  <StrictMode>
    <App fileSystem={tauriFileSystem} newId={newId} />
  </StrictMode>
);
