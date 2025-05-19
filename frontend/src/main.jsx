import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

// Import layout + pagini
import SidebarLayout from "./layout/SidebarLayout";
import Dashboard from "./pages/Dashboard";
import Nomenclature from "./pages/Nomenclature";
import TrainModel from "./pages/TrainModel";
import Reports from "./pages/Reports";

// Importăm CSS-urile existente
import "./index.css";
import "./App.css";

/** Aceeași temă ca în vechiul App.jsx */
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bgGradient: "linear(to-br, #0f0c29, #302b63, #24243e)",
        color: "white",
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          {/* Folosim un layout general care conține sidebar + top bar */}
          <Route path="/" element={<SidebarLayout />}>
            {/* Când user-ul e pe "/", să-l redirecționăm la "/dashboard" */}
            <Route index element={<Dashboard />} />

            <Route path="dashboard" element={<Dashboard />} />
            <Route path="nomenclature" element={<Nomenclature />} />

            <Route path="train-model" element={<TrainModel />} />
            <Route path="reports" element={<Reports />} />

            {/* poți adăuga altele, dacă vei avea */}
          </Route>
        </Routes>
      </Router>
    </ChakraProvider>
  </React.StrictMode>
);
