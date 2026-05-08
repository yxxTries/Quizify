import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ThemeProvider>
          <App />
          <Analytics />
        </ThemeProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>
);
