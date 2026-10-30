import { Link, NavLink } from "react-router";
import { ArrowUpRight, Ruler, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function SiteHeader() {
  const { activeProfileKey, switchProfile, unitSystem, toggleUnitSystem } = useAuth();

  return (
    <header className="site-header">
      <div className="brand-cluster">
        <Link to="/" className="brand" aria-label="PLUMB home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>PLUMB</span>
        </Link>
        <span className="unitec-badge" title="Prepared for UNITEC USA Design Demo">
          × UNITEC USA
        </span>
      </div>

      <nav className="main-nav" aria-label="Primary navigation">
        <NavLink to="/" end>
          Guides
        </NavLink>
        <NavLink to="/materials">UNITEC Pilot</NavLink>
        <NavLink to="/calculator">Calculator</NavLink>
        <NavLink to="/studio">Field Studio</NavLink>
      </nav>

      <div className="header-right-cluster">
        <button
          type="button"
          className="unit-header-button"
          onClick={toggleUnitSystem}
          title="Switch between Metric (cm/mm) and US Imperial (ft/in)"
        >
          <Ruler size={13} />
          <span>{unitSystem === "metric" ? "CM / MM" : "FT / IN"}</span>
        </button>

        <label className="demo-role-switcher" title="Instant Demo Role Switcher (No external login required)">
          {activeProfileKey === "admin" ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
          <span className="sr-only">Demo Role</span>
          <select
            value={activeProfileKey}
            onChange={(event) =>
              switchProfile(event.target.value as "admin" | "installer" | "guest")
            }
          >
            <option value="admin">Demo: Admin / Reviewer</option>
            <option value="installer">Demo: Lead Installer</option>
            <option value="guest">Demo: Guest View</option>
          </select>
        </label>

        <Link className="header-action" to="/guides/paste-the-wall">
          Start Guide
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
