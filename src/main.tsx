import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createGlobalStyle } from "styled-components";

const Global = createGlobalStyle`
  body {
    background-image: url("gsfc_20171208_archive_e000226_orig-2.jpg");
  }
`;

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Global />
    <App />
  </React.StrictMode>
);

# Haga clic en ./src/main.tsx, y edite el archivo (por ejemplo, agregue un comentario).
