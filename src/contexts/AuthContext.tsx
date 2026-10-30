import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DemoUserRole = "admin" | "user";

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: DemoUserRole;
  title: string;
}

const DEMO_PROFILES: Record<string, DemoUser> = {
  admin: {
    id: 1,
    name: "Unitec USA Technical Director",
    email: "director@unitecusadesign.com",
    role: "admin",
    title: "Admin & Field Reviewer",
  },
  installer: {
    id: 2,
    name: "Carlos Méndez (Lead Installer)",
    email: "cmendez@unitecusadesign.com",
    role: "user",
    title: "Certified Field Installer",
  },
};

interface AuthContextValue {
  user: DemoUser | null;
  loading: boolean;
  activeProfileKey: "admin" | "installer" | "guest";
  switchProfile: (key: "admin" | "installer" | "guest") => void;
  logout: () => void;
}

const STORAGE_KEY = "plumb_unitec_demo_profile_v1";

const AuthContext = createContext<AuthContextValue>({
  user: DEMO_PROFILES.admin,
  loading: false,
  activeProfileKey: "admin",
  switchProfile: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeProfileKey, setActiveProfileKey] = useState<"admin" | "installer" | "guest">(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "admin" || saved === "installer" || saved === "guest") return saved;
    } catch {
      // ignore storage errors
    }
    return "admin";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeProfileKey);
    } catch {
      // ignore storage errors
    }
  }, [activeProfileKey]);

  const user = activeProfileKey === "guest" ? null : DEMO_PROFILES[activeProfileKey];

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        activeProfileKey,
        switchProfile: setActiveProfileKey,
        logout: () => setActiveProfileKey("guest"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
