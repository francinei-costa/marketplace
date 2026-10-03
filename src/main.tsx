import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";

import "./index.css";

async function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { worker } = await import("./mocks/browser");
    await worker.start();
  }

  const { App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
