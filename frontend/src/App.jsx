import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginScreen from "./components/screens/LoginScreen.jsx";
import FactionScreen from "./components/screens/FractionScreen.jsx";
import InstallGate from "./components/pwa/InstallGate.jsx";
import useInstall from "./components/pwa/useInstall.js";
import DesktopGate from "./components/utils/DesktopGate.jsx";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import ProfileScreen from "./components/screens/ProfileScreen.jsx";
import DashboardScreen from "./components/screens/DashboardScreen.jsx";

import "./index.css";

export default function App() {
  const { showGate, canInstall, install, dismiss } = useInstall();

  return (
    <>
      <div className="hidden md:block">
        <DesktopGate />
      </div>

      <div className="md:hidden">
        {showGate ? (
          <InstallGate canInstall={canInstall} onInstall={install} onContinue={dismiss} />
        ) : (
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route path="/login" element={<LoginScreen />} />

                <Route
                  path="/faction"
                  element={
                    <RequireAuth>
                      <FactionScreen />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <ProfileScreen />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardScreen />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        )}
      </div>
    </>
  );
}
