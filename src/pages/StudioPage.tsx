import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FilePlus2,
  MailPlus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import type { Guide } from "@contracts/guide";
import { GuideEditor } from "@/components/GuideEditor";
import { GuidePlayer } from "@/components/GuidePlayer";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/contexts/AuthContext";
import { resetDemoStore, trpc } from "@/lib/trpc";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function StudioPage() {
  const { user, activeProfileKey, switchProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const utils = trpc.useUtils();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [moderationNotes, setModerationNotes] = useState<Record<number, string>>({});
  const [saveMessage, setSaveMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"installer" | "reviewer">("installer");
  const [inviteGuideSlug, setInviteGuideSlug] = useState<"paste-the-wall" | "peel-and-stick">("paste-the-wall");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [uploadFeedback, setUploadFeedback] = useState("");

  const drafts = trpc.guides.myDrafts.useQuery(undefined, { enabled: Boolean(user) });
  const reviewQueue = trpc.guides.reviewQueue.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const invites = trpc.invites.listMine.useQuery(undefined, { enabled: Boolean(user) });
  const assets = trpc.assets.listMine.useQuery(undefined, { enabled: Boolean(user) });

  const createDraft = trpc.guides.createDraftFromApproved.useMutation({
    onSuccess: (record) => {
      setSelectedId(record.id);
      setSaveMessage(`Created editable draft from ${record.slug}.`);
      void utils.guides.myDrafts.invalidate();
    },
  });

  const saveDraft = trpc.guides.saveDraft.useMutation({
    onSuccess: () => {
      setSaveMessage("Draft saved and validated.");
      void utils.guides.myDrafts.invalidate();
    },
  });

  const submitForReview = trpc.guides.submitForReview.useMutation({
    onSuccess: () => {
      setSaveMessage("Submitted for review.");
      void utils.guides.myDrafts.invalidate();
      void utils.guides.reviewQueue.invalidate();
    },
  });

  const reviewGuide = trpc.guides.review.useMutation({
    onSuccess: (result) => {
      setSaveMessage(`Review recorded. Version is now V${result.version}.`);
      void utils.guides.myDrafts.invalidate();
      void utils.guides.reviewQueue.invalidate();
      void utils.guides.listApproved.invalidate();
    },
  });

  const createInvite = trpc.invites.create.useMutation({
    onSuccess: (result) => {
      setInviteEmail("");
      setInviteNote("");
      setInviteFeedback(
        `Invite created for ${result.email}. Share link: ${window.location.origin}${result.acceptPath}`
      );
      void utils.invites.listMine.invalidate();
    },
  });

  const acceptInvite = trpc.invites.accept.useMutation({
    onSuccess: (invite) => {
      setInviteFeedback(`Accepted ${invite.role} invite for ${invite.email}.`);
      searchParams.delete("invite");
      setSearchParams(searchParams, { replace: true });
      void utils.invites.listMine.invalidate();
    },
  });

  const revokeInvite = trpc.invites.revoke.useMutation({
    onSuccess: () => {
      void utils.invites.listMine.invalidate();
    },
  });

  const uploadAsset = trpc.assets.upload.useMutation({
    onSuccess: (asset) => {
      setUploadFeedback(`Uploaded ${asset.fileName}.`);
      void utils.assets.listMine.invalidate();
    },
  });

  useEffect(() => {
    if (!selectedId && drafts.data && drafts.data.length > 0) {
      setSelectedId(drafts.data[0].id);
    }
  }, [drafts.data, selectedId]);

  const selectedDraft = useMemo(
    () => drafts.data?.find((item) => item.id === selectedId) ?? null,
    [drafts.data, selectedId]
  );

  const handleSaveDraft = (guide: Guide) => {
    if (!selectedDraft) return;
    setSaveMessage("");
    saveDraft.mutate({ id: selectedDraft.id, data: guide });
  };

  const handleInviteSubmit = (event: FormEvent) => {
    event.preventDefault();
    setInviteFeedback("");
    createInvite.mutate({
      email: inviteEmail,
      role: inviteRole,
      guideSlug: inviteGuideSlug,
      note: inviteNote.trim() || undefined,
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadFeedback("");
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
    if (!allowed.includes(file.type as (typeof allowed)[number])) {
      setUploadFeedback("Choose a PNG, JPEG, WebP or PDF file.");
      return;
    }
    const base64Data = await fileToBase64(file);
    uploadAsset.mutate({
      fileName: file.name,
      mimeType: file.type as (typeof allowed)[number],
      base64Data,
      guideId: selectedDraft?.id,
    });
  };

  return (
    <div className="site-shell studio-page">
      <SiteHeader />
      <main className="studio-main">
        <header className="studio-hero">
          <div>
            <p className="mono-kicker acid-text">FIELD STUDIO / AUTHORING & MODERATION</p>
            <h1>Draft, review and publish installation sequences.</h1>
          </div>
          <div>
            <p>
              Signed in as <strong>{user?.name || "Guest"}</strong> (
              {user?.role === "admin" ? "Admin & Reviewer" : user ? "Installer / Author" : "Guest"}
              ). Approved guides power the public library, print sheet and MP4 exporter.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className={activeProfileKey === "admin" ? "primary-button" : "secondary-button"}
                onClick={() => switchProfile("admin")}
              >
                <ShieldCheck size={15} /> Admin / Reviewer Mode
              </button>
              <button
                type="button"
                className={activeProfileKey === "installer" ? "primary-button" : "secondary-button"}
                onClick={() => switchProfile("installer")}
              >
                Installer / Author Mode
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  resetDemoStore();
                  setSaveMessage("Demo data reset to factory seed.");
                }}
              >
                <RotateCcw size={14} /> Reset Demo Data
              </button>
            </div>
          </div>
        </header>

        {!user ? (
          <section className="studio-panel">
            <h2>Select a Demo Profile above to edit guides</h2>
            <p className="muted-copy">
              Click "Admin / Reviewer Mode" or "Installer / Author Mode" above to test the complete
              authoring and review workflow.
            </p>
          </section>
        ) : (
          <>
            {inviteToken && (
              <section className="invite-banner" aria-label="Team invite">
                <div>
                  <p className="mono-kicker acid-text">INVITATION TOKEN DETECTED</p>
                  <h2>Accept your field invite?</h2>
                  <p>Token {inviteToken.slice(0, 12)}… is ready to link to your account.</p>
                </div>
                <button
                  className="primary-button"
                  disabled={acceptInvite.isPending}
                  onClick={() => acceptInvite.mutate({ token: inviteToken })}
                >
                  <Check size={16} />{" "}
                  {acceptInvite.isPending ? "Accepting…" : "Accept invite"}
                </button>
              </section>
            )}

            <section className="studio-grid">
              <aside className="studio-sidebar">
                <div className="studio-panel">
                  <p className="mono-kicker acid-text">01 / CREATE OR SELECT DRAFT</p>
                  <h2>Your guide drafts</h2>
                  <div className="draft-create-actions">
                    <button
                      className="secondary-button"
                      disabled={createDraft.isPending}
                      onClick={() => createDraft.mutate({ slug: "paste-the-wall" })}
                    >
                      <FilePlus2 size={16} /> New paste-the-wall draft
                    </button>
                    <button
                      className="secondary-button"
                      disabled={createDraft.isPending}
                      onClick={() => createDraft.mutate({ slug: "peel-and-stick" })}
                    >
                      <FilePlus2 size={16} /> New peel-and-stick draft
                    </button>
                  </div>

                  {drafts.data && drafts.data.length === 0 && (
                    <p className="muted-copy">
                      Create a draft from either approved guide to start editing steps, warnings,
                      durations and callouts.
                    </p>
                  )}

                  <div className="draft-list">
                    {drafts.data?.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`draft-card ${selectedId === item.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setSaveMessage("");
                        }}
                      >
                        <div>
                          <span className="mono-kicker">
                            {item.slug} · V{item.version}
                          </span>
                          <strong>{item.title}</strong>
                        </div>
                        <span className={`status-pill status-${item.status}`}>{item.status}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="studio-panel">
                  <p className="mono-kicker acid-text">02 / SUBMIT FOR APPROVAL</p>
                  <h2>Moderation handoff</h2>
                  {selectedDraft ? (
                    <>
                      <p className="muted-copy">
                        Current status: <strong>{selectedDraft.status}</strong>. Submitting places
                        this draft in the review queue before it can replace the public guide.
                      </p>
                      {selectedDraft.reviewNote && (
                        <p className="review-note">Latest note: {selectedDraft.reviewNote}</p>
                      )}
                      <label>
                        <span>Submission note for reviewer</span>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          maxLength={500}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Clarified priming wait language and step 6 roller width."
                        />
                      </label>
                      <button
                        className="primary-button full-width"
                        type="button"
                        disabled={submitForReview.isPending}
                        onClick={() =>
                          submitForReview.mutate({
                            id: selectedDraft.id,
                            reviewNote: reviewComment.trim() || undefined,
                          })
                        }
                      >
                        <Send size={16} />{" "}
                        {submitForReview.isPending ? "Submitting…" : "Submit for review"}
                      </button>
                    </>
                  ) : (
                    <p className="muted-copy">Select or create a draft first.</p>
                  )}
                </div>

                <div className="studio-panel">
                  <p className="mono-kicker acid-text">03 / TEAM INVITES</p>
                  <h2>Invite installer or reviewer</h2>
                  <form className="stack-form" onSubmit={handleInviteSubmit}>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="installer@site-team.example"
                      />
                    </label>
                    <label>
                      <span>Role</span>
                      <select
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as "installer" | "reviewer")
                        }
                      >
                        <option value="installer">Installer</option>
                        <option value="reviewer">Reviewer</option>
                      </select>
                    </label>
                    <label>
                      <span>Guide focus</span>
                      <select
                        value={inviteGuideSlug}
                        onChange={(event) =>
                          setInviteGuideSlug(
                            event.target.value as "paste-the-wall" | "peel-and-stick"
                          )
                        }
                      >
                        <option value="paste-the-wall">Paste-the-wall</option>
                        <option value="peel-and-stick">Peel-and-stick</option>
                      </select>
                    </label>
                    <label>
                      <span>Note (optional)</span>
                      <input
                        value={inviteNote}
                        maxLength={280}
                        onChange={(event) => setInviteNote(event.target.value)}
                        placeholder="Please verify room prep and electrical isolation copy."
                      />
                    </label>
                    <button
                      className="secondary-button full-width"
                      type="submit"
                      disabled={createInvite.isPending}
                    >
                      <MailPlus size={16} />{" "}
                      {createInvite.isPending ? "Creating invite…" : "Create invite link"}
                    </button>
                  </form>
                  {inviteFeedback && <p className="success-message">{inviteFeedback}</p>}

                  {invites.data && invites.data.length > 0 && (
                    <div className="compact-records">
                      {invites.data.map((invite) => (
                        <div key={invite.id} className="compact-record">
                          <div>
                            <strong>{invite.email}</strong>
                            <span>
                              {invite.role} · {invite.status}
                            </span>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="icon-button"
                              title="Copy invite link"
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  `${window.location.origin}/studio?invite=${invite.token}`
                                )
                              }
                            >
                              <Copy size={15} />
                            </button>
                            {invite.status === "pending" && (
                              <button
                                type="button"
                                className="icon-button"
                                title="Revoke invite"
                                onClick={() => revokeInvite.mutate({ id: invite.id })}
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="studio-panel">
                  <p className="mono-kicker acid-text">04 / REFERENCE ASSETS</p>
                  <h2>Roll labels & site photos</h2>
                  <p className="muted-copy">
                    Upload label photos or technical sheets (PNG, JPEG, WebP or PDF up to 4 MB).
                  </p>
                  <label className="upload-button secondary-button full-width">
                    <Upload size={16} />{" "}
                    {uploadAsset.isPending ? "Uploading…" : "Upload reference file"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      hidden
                      onChange={handleFileChange}
                      disabled={uploadAsset.isPending}
                    />
                  </label>
                  {uploadFeedback && <p className="success-message">{uploadFeedback}</p>}
                  {assets.data && assets.data.length > 0 && (
                    <div className="compact-records">
                      {assets.data.map((asset) => (
                        <a
                          key={asset.id}
                          className="compact-record"
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div>
                            <strong>{asset.fileName}</strong>
                            <span>{Math.max(1, Math.round(asset.sizeBytes / 1024))} KB</span>
                          </div>
                          <ExternalLink size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <div className="studio-workspace">
                {user.role === "admin" && (
                  <section className="studio-panel review-panel" aria-labelledby="review-queue-heading">
                    <div className="review-panel-header">
                      <div>
                        <p className="mono-kicker acid-text">ADMIN MODERATION QUEUE</p>
                        <h2 id="review-queue-heading">Submitted guides awaiting review</h2>
                      </div>
                      <ClipboardCheck size={22} className="acid-icon" />
                    </div>

                    {reviewQueue.data && reviewQueue.data.length === 0 && (
                      <p className="muted-copy">No submitted guides are waiting in the queue.</p>
                    )}

                    <div className="review-queue-list">
                      {reviewQueue.data?.map((item) => (
                        <article key={item.id} className="review-item">
                          <div>
                            <span className="mono-kicker">
                              {item.slug} · candidate based on V{item.version}
                            </span>
                            <h3>{item.title}</h3>
                            <p>{item.reviewNote || "No submission note provided."}</p>
                          </div>
                          <div className="review-controls">
                            <input
                              value={moderationNotes[item.id] ?? ""}
                              onChange={(event) =>
                                setModerationNotes((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Approval or rejection note"
                            />
                            <button
                              className="primary-button"
                              type="button"
                              disabled={reviewGuide.isPending}
                              onClick={() =>
                                reviewGuide.mutate({
                                  id: item.id,
                                  decision: "approved",
                                  reviewNote: moderationNotes[item.id],
                                })
                              }
                            >
                              <CheckCircle2 size={16} /> Approve & publish
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={reviewGuide.isPending}
                              onClick={() =>
                                reviewGuide.mutate({
                                  id: item.id,
                                  decision: "rejected",
                                  reviewNote: moderationNotes[item.id],
                                })
                              }
                            >
                              <XCircle size={16} /> Request changes
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {selectedDraft ? (
                  <>
                    <GuideEditor
                      guide={selectedDraft.data}
                      version={selectedDraft.version}
                      onSave={handleSaveDraft}
                      isSaving={saveDraft.isPending}
                      saveError={saveDraft.error?.message}
                      saveMessage={saveMessage}
                    />
                    <section className="studio-preview" aria-label="Live draft preview">
                      <div className="studio-preview-heading">
                        <p className="mono-kicker acid-text">
                          <Sparkles size={13} /> LIVE 2D BLUEPRINT + 3D DRAFT PREVIEW
                        </p>
                        <Link className="text-button" to={`/guides/${selectedDraft.slug}`}>
                          Compare with public guide <ExternalLink size={14} />
                        </Link>
                      </div>
                      <GuidePlayer guide={selectedDraft.data} />
                    </section>
                  </>
                ) : (
                  <section className="studio-panel empty-editor">
                    <h2>Create a draft to begin editing</h2>
                    <p className="muted-copy">
                      Every draft clones the validated 12-step structure, safety gates, tools, sources
                      and 2D/3D visual states from an approved guide.
                    </p>
                  </section>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
