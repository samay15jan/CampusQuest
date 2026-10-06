import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginScreen from "./components/screens/LoginScreen.jsx";
import FactionScreen from "./components/screens/FractionScreen.jsx";
import DesktopGate from "./components/utils/DesktopGate.jsx";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import ProfileScreen from "./components/screens/ProfileScreen.jsx";
import DashboardScreen from "./components/screens/DashboardScreen.jsx";

import "./index.css";

export default function App() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();

      // Don't show it again if we've already shown it once
      if (localStorage.getItem("campusquest-install-shown")) {
        return;
      }

      setInstallPrompt(event);
      setShowInstall(true);

      // Mark it immediately so it NEVER appears again
      localStorage.setItem("campusquest-install-shown", "true");
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installPWA = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();

    setInstallPrompt(null);
    setShowInstall(false);
  };

  const dismissInstall = () => {
    setShowInstall(false);
    setInstallPrompt(null);
  };

  return (
    <>
      <div className="hidden md:block">
        <DesktopGate />
      </div>

      <div className="md:hidden">
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
      </div>

      {/* PWA Install Popup */}
      {showInstall && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] p-3 shadow-2xl">
            
            {/* Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-lg font-bold text-white">CQ</span>
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Install CampusQuest
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                Add it to your home screen for quick access.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={dismissInstall}
                className="px-2 py-2 text-xs font-medium text-gray-400"
              >
                Later
              </button>

              <button
                onClick={installPWA}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}