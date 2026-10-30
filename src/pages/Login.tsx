import { useNavigate } from "react-router";
import { ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { switchProfile } = useAuth();
  const navigate = useNavigate();

  const selectAndContinue = (role: "admin" | "installer") => {
    switchProfile(role);
    navigate("/studio");
  };

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="route-state">
        <p className="mono-kicker acid-text">PLUMB × UNITEC USA / DEMO ACCESS</p>
        <h1>Choose a demonstration role.</h1>
        <p>
          Select an active profile to test Field Studio authoring, moderation review queues, team
          invitations, and saved room calculations without external OAuth walls.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
          <button className="primary-button" onClick={() => selectAndContinue("admin")}>
            <ShieldCheck size={17} /> Enter as Admin / Reviewer <ArrowRight size={16} />
          </button>
          <button className="secondary-button" onClick={() => selectAndContinue("installer")}>
            <UserCheck size={17} /> Enter as Lead Installer
          </button>
        </div>
      </main>
    </div>
  );
}
