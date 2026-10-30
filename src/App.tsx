import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import CalculatorPage from "./pages/CalculatorPage";
import GuidePage from "./pages/GuidePage";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MaterialsPage from "./pages/MaterialsPage";
import NotFound from "./pages/NotFound";
import StudioPage from "./pages/StudioPage";
import TaskSimulatorPage from "./pages/TaskSimulatorPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/guides/:slug" element={<GuidePage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/simulator" element={<TaskSimulatorPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
