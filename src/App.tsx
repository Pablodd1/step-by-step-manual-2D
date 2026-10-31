import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";

const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const Login = lazy(() => import("./pages/Login"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StudioPage = lazy(() => import("./pages/StudioPage"));
const TaskSimulatorPage = lazy(() => import("./pages/TaskSimulatorPage"));
const WallpaperTrainingPage = lazy(() => import("./wallpaper/WallpaperTrainingPage"));

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div role="status" style={{ padding: 32 }}>Loading training module…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/guides/paste-the-wall" element={<WallpaperTrainingPage />} />
            <Route path="/training/wallpaper" element={<WallpaperTrainingPage />} />
            <Route path="/guides/:slug" element={<GuidePage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/simulator" element={<TaskSimulatorPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
