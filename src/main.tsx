import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "./i18n";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth/auth-context";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster richColors position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
