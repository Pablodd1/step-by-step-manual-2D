import { useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { GuidePlayer } from "@/components/GuidePlayer";
import { PrintSheetDialog } from "@/components/PrintSheetDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { VideoExportDialog } from "@/components/VideoExportDialog";
import { trpc } from "@/lib/trpc";
import { unitecPanelGuides } from "@contracts/guides/unitec-panels";
import type { GuideEngine } from "@/scene/GuideEngine";
import NotFound from "./NotFound";

export default function GuidePage() {
  const { slug = "" } = useParams();
  const builtInPanel = unitecPanelGuides.find((guide) => guide.slug === slug);
  const guideQuery = trpc.guides.getApproved.useQuery({ slug }, { enabled: Boolean(slug) && !builtInPanel, retry: false });
  const [printEngine, setPrintEngine] = useState<GuideEngine | null>(null);
  const [exportEngine, setExportEngine] = useState<GuideEngine | null>(null);

  if (!builtInPanel && guideQuery.isLoading) {
    return <div className="site-shell"><SiteHeader /><main className="route-state" role="status"><span className="skeleton-line" /><p>Preparing the approved field guide…</p></main></div>;
  }
  if (!builtInPanel && guideQuery.error?.data?.code === "NOT_FOUND") return <NotFound />;
  if (!builtInPanel && (guideQuery.error || !guideQuery.data)) {
    return <div className="site-shell"><SiteHeader /><main className="route-state" role="alert"><AlertCircle size={30} /><h1>We couldn’t open this guide.</h1><p>{guideQuery.error?.message ?? "The guide response was empty."}</p><div><button className="primary-button" onClick={() => guideQuery.refetch()}>Try again</button><Link className="secondary-button" to="/">Back to the library</Link></div></main></div>;
  }

  const guide = builtInPanel ?? guideQuery.data!.data;
  return (
    <div className="site-shell guide-page">
      <SiteHeader />
      <div className="guide-context-bar">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={15} /> Guide library</Link>
          <span className="context-separator">/</span>
          <span>{guide.product ? `${guide.product.brand} · SKU ${guide.product.sku}` : guide.method === "paste-the-wall" ? "Paste the wall" : "Peel & stick"}</span>
        </div>
        <div className="guide-context-title">
          <BookOpen size={16} />
          <strong>{guide.title}</strong>
        </div>
        <details className="source-menu">
          <summary>Sources & scope <ExternalLink size={14} /></summary>
          <div className="source-popover">
            <p>{guide.manufacturerNotice}</p>
            <ul>
              {guide.sources.map((source) => (
                <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}: {source.title}<ExternalLink size={12} /></a></li>
              ))}
            </ul>
          </div>
        </details>
      </div>
      <main>
        <GuidePlayer guide={guide} onPrint={setPrintEngine} onExport={setExportEngine} />
      </main>
      {printEngine && <PrintSheetDialog guide={guide} engine={printEngine} onClose={() => setPrintEngine(null)} />}
      {exportEngine && <VideoExportDialog guide={guide} engine={exportEngine} onClose={() => setExportEngine(null)} />}
    </div>
  );
}
