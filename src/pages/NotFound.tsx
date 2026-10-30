import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="route-state">
        <p className="mono-kicker acid-text">404 / ROUTE NOT FOUND</p>
        <h1>This section is not on the blueprint.</h1>
        <p>Return to the field manual library or launch the roll & panel calculator.</p>
        <div>
          <Link className="primary-button" to="/">
            <ArrowLeft size={16} /> Back to Home Library
          </Link>
          <Link className="secondary-button" to="/materials">
            UNITEC 3-Material Pilot
          </Link>
        </div>
      </main>
    </div>
  );
}
