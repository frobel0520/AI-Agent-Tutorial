import React from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "../src/AppErrorBoundary.jsx";
import "../src/styles.css";

function ThrowingFixture() {
  throw new Error("fixture-only secret-like details must not be rendered");
}

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <ThrowingFixture />
  </AppErrorBoundary>,
);
