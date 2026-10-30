import { useEffect, useState } from "react";
import { calculateWallpaper, type CalculatorInput, type CalculatorResult } from "@contracts/calculator";
import { type Guide } from "@contracts/guide";
import { unitecPanelGuides } from "@contracts/guides/unitec-panels";
import { approvedWallpaperGuides, pasteTheWallGuide, peelAndStickGuide } from "@contracts/guides/wallpaper-guides";

export interface GuideRecord {
  id: number;
  slug: Guide["slug"];
  title: string;
  method: Guide["method"];
  status: "approved" | "draft" | "submitted" | "rejected";
  version: number;
  data: Guide;
  ownerId: number | null;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedEstimateRecord {
  id: number;
  name: string;
  method: Guide["method"];
  input: CalculatorInput;
  result: CalculatorResult;
  createdAt: string;
}

export interface TeamInviteRecord {
  id: number;
  email: string;
  role: "installer" | "reviewer";
  guideSlug: Guide["slug"] | null;
  note: string | null;
  status: "pending" | "accepted" | "revoked";
  token: string;
  createdAt: string;
}

export interface UploadedAssetRecord {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

interface LocalStoreState {
  guides: GuideRecord[];
  estimates: SavedEstimateRecord[];
  invites: TeamInviteRecord[];
  assets: UploadedAssetRecord[];
}

const STORE_KEY = "plumb_unitec_field_store_v2";

function createInitialStore(): LocalStoreState {
  const now = "2026-10-29T17:16:57.000Z";
  const defaultInput: CalculatorInput = {
    method: "paste-the-wall",
    wallWidthCm: 420,
    wallHeightCm: 255,
    openingsAreaSqM: 1.6,
    rollWidthCm: 52,
    rollLengthCm: 1005,
    patternRepeatCm: 64,
    patternMatch: "straight",
    trimAllowanceCm: 10,
    wastePercent: 10,
  };

  // Pre-seed both approved wallpaper guides + 3 UNITEC panel guides + 1 sample draft in review queue
  const approvedRecords: GuideRecord[] = [
    ...approvedWallpaperGuides.map((g, idx) => ({
      id: idx + 1,
      slug: g.slug,
      title: g.title,
      method: g.method,
      status: "approved" as const,
      version: 1,
      data: g,
      ownerId: null,
      reviewNote: "Verified against Wallcoverings Association & manufacturer label specs.",
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: 1,
      createdAt: now,
      updatedAt: now,
    })),
    ...unitecPanelGuides.map((g, idx) => ({
      id: idx + 3,
      slug: g.slug,
      title: g.title,
      method: g.method,
      status: "approved" as const,
      version: 1,
      data: g,
      ownerId: 1,
      reviewNote: `UNITEC USA Pilot SKU ${g.product?.sku ?? ""} — geometry & dimensions locked to official catalog.`,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: 1,
      createdAt: now,
      updatedAt: now,
    })),
    {
      id: 101,
      slug: "paste-the-wall",
      title: pasteTheWallGuide.title,
      method: pasteTheWallGuide.method,
      status: "draft",
      version: 1,
      data: structuredClone(pasteTheWallGuide),
      ownerId: 1,
      reviewNote: "Working field draft ready for custom contractor notes or client adaptation.",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 102,
      slug: "peel-and-stick",
      title: peelAndStickGuide.title,
      method: peelAndStickGuide.method,
      status: "submitted",
      version: 1,
      data: structuredClone(peelAndStickGuide),
      ownerId: 2,
      reviewNote: "Added commercial hospitality primer cure check on Step 1.",
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    guides: approvedRecords,
    estimates: [
      {
        id: 1,
        name: "Miami Showroom Feature Wall — North",
        method: "paste-the-wall",
        input: defaultInput,
        result: calculateWallpaper(defaultInput),
        createdAt: now,
      },
    ],
    invites: [
      {
        id: 1,
        email: "installers-team@unitecusadesign.com",
        role: "installer",
        guideSlug: "paste-the-wall",
        note: "Field crew onboarding for Q4 commercial hospitality rollout",
        status: "pending",
        token: "unitec-demo-token-01",
        createdAt: now,
      },
    ],
    assets: [
      {
        id: 1,
        fileName: "UNITEC-SKU-14122019-WPC-Choco-Mix.webp",
        mimeType: "image/webp",
        sizeBytes: 38420,
        url: "/products/14122019.webp",
        createdAt: now,
      },
      {
        id: 2,
        fileName: "UNITEC-SKU-14121211-Marble-Eclipse.webp",
        mimeType: "image/webp",
        sizeBytes: 62150,
        url: "/products/14121211.webp",
        createdAt: now,
      },
      {
        id: 3,
        fileName: "UNITEC-SKU-14126406-DuoSmall-Vainilla.webp",
        mimeType: "image/webp",
        sizeBytes: 29840,
        url: "/products/14126406.webp",
        createdAt: now,
      },
    ],
  };
}

let memoryStore: LocalStoreState | null = null;
const listeners = new Set<() => void>();

function readStore(): LocalStoreState {
  if (memoryStore) return memoryStore;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalStoreState;
      if (parsed && Array.isArray(parsed.guides) && parsed.guides.length >= 2) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch {
    // fallback to default seed
  }
  memoryStore = createInitialStore();
  return memoryStore;
}

function writeStore(updater: (prev: LocalStoreState) => LocalStoreState) {
  const next = updater(readStore());
  memoryStore = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  listeners.forEach((fn) => fn());
}

export function resetDemoStore() {
  memoryStore = createInitialStore();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memoryStore));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function useStoreSelector<T>(selector: (state: LocalStoreState) => T): {
  data: T;
  isLoading: boolean;
  error: (Error & { data?: { code?: string } }) | null;
  refetch: () => void;
} {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    data: selector(readStore()),
    isLoading: false,
    error: null,
    refetch: () => setTick((t) => t + 1),
  };
}

interface MutationOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (err: Error) => void;
}

function createMutation<TInput, TOutput>(
  fn: (input: TInput) => TOutput,
  options?: MutationOptions<TOutput>
) {
  return {
    isPending: false,
    error: null as Error | null,
    mutate: (input: TInput) => {
      try {
        const res = fn(input);
        options?.onSuccess?.(res);
      } catch (err) {
        options?.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
  };
}

export const trpc = {
  useUtils: () => ({
    guides: {
      myDrafts: { invalidate: async () => listeners.forEach((l) => l()) },
      reviewQueue: { invalidate: async () => listeners.forEach((l) => l()) },
      listApproved: { invalidate: async () => listeners.forEach((l) => l()) },
      getApproved: { invalidate: async () => listeners.forEach((l) => l()) },
    },
    calculator: {
      listMine: { invalidate: async () => listeners.forEach((l) => l()) },
    },
    invites: {
      listMine: { invalidate: async () => listeners.forEach((l) => l()) },
    },
    assets: {
      listMine: { invalidate: async () => listeners.forEach((l) => l()) },
    },
  }),

  guides: {
    listApproved: {
      useQuery: () =>
        useStoreSelector((s) =>
          s.guides.filter(
            (g) => g.status === "approved" && (g.slug === "paste-the-wall" || g.slug === "peel-and-stick")
          )
        ),
    },
    listAllApproved: {
      useQuery: () => useStoreSelector((s) => s.guides.filter((g) => g.status === "approved")),
    },
    getApproved: {
      useQuery: ({ slug }: { slug: Guide["slug"] }, _opts?: { enabled?: boolean; retry?: boolean }) =>
        useStoreSelector((s) => s.guides.find((g) => g.status === "approved" && g.slug === slug) ?? null),
    },
    myDrafts: {
      useQuery: (_input?: unknown, _opts?: { enabled?: boolean }) =>
        useStoreSelector((s) => s.guides.filter((g) => g.status !== "approved")),
    },
    reviewQueue: {
      useQuery: (_input?: unknown, _opts?: { enabled?: boolean }) =>
        useStoreSelector((s) => s.guides.filter((g) => g.status === "submitted")),
    },
    createDraftFromApproved: {
      useMutation: (opts?: MutationOptions<GuideRecord>) =>
        createMutation(({ slug }: { slug: Guide["slug"] }) => {
          const store = readStore();
          const base =
            store.guides.find((g) => g.status === "approved" && g.slug === slug) ??
            store.guides[0];
          const newId = Math.max(200, ...store.guides.map((g) => g.id)) + 1;
          const now = new Date().toISOString();
          const record: GuideRecord = {
            id: newId,
            slug: base.slug,
            title: base.data.title,
            method: base.data.method,
            status: "draft",
            version: base.version,
            data: structuredClone(base.data),
            ownerId: 1,
            reviewNote: null,
            submittedAt: null,
            reviewedAt: null,
            reviewedBy: null,
            createdAt: now,
            updatedAt: now,
          };
          writeStore((prev) => ({ ...prev, guides: [record, ...prev.guides] }));
          return record;
        }, opts),
    },
    saveDraft: {
      useMutation: (opts?: MutationOptions<GuideRecord>) =>
        createMutation(({ id, data }: { id: number; data: Guide }) => {
          let updatedRecord!: GuideRecord;
          writeStore((prev) => ({
            ...prev,
            guides: prev.guides.map((g) => {
              if (g.id !== id) return g;
              updatedRecord = {
                ...g,
                title: data.title,
                data: structuredClone(data),
                status: g.status === "rejected" ? "draft" : g.status,
                updatedAt: new Date().toISOString(),
              };
              return updatedRecord;
            }),
          }));
          return updatedRecord;
        }, opts),
    },
    submitForReview: {
      useMutation: (opts?: MutationOptions<GuideRecord>) =>
        createMutation(({ id, reviewNote }: { id: number; reviewNote?: string }) => {
          let updated!: GuideRecord;
          const now = new Date().toISOString();
          writeStore((prev) => ({
            ...prev,
            guides: prev.guides.map((g) => {
              if (g.id !== id) return g;
              updated = {
                ...g,
                status: "submitted",
                reviewNote: reviewNote ?? g.reviewNote,
                submittedAt: now,
                updatedAt: now,
              };
              return updated;
            }),
          }));
          return updated;
        }, opts),
    },
    review: {
      useMutation: (opts?: MutationOptions<{ version: number }>) =>
        createMutation(
          ({
            id,
            decision,
            reviewNote,
          }: {
            id: number;
            decision: "approved" | "rejected";
            reviewNote?: string;
          }) => {
            const now = new Date().toISOString();
            let nextVersion = 2;
            writeStore((prev) => {
              const target = prev.guides.find((g) => g.id === id);
              if (!target) return prev;
              nextVersion = target.version + 1;
              return {
                ...prev,
                guides: prev.guides.map((g) => {
                  if (decision === "approved" && g.status === "approved" && g.slug === target.slug) {
                    return {
                      ...g,
                      version: nextVersion,
                      title: target.data.title,
                      data: structuredClone(target.data),
                      reviewNote: reviewNote ?? target.reviewNote,
                      reviewedAt: now,
                      updatedAt: now,
                    };
                  }
                  if (g.id === id) {
                    return {
                      ...g,
                      status: decision,
                      version: decision === "approved" ? nextVersion : g.version,
                      reviewNote: reviewNote ?? g.reviewNote,
                      reviewedAt: now,
                      updatedAt: now,
                    };
                  }
                  return g;
                }),
              };
            });
            return { version: nextVersion };
          },
          opts
        ),
    },
  },

  calculator: {
    listMine: {
      useQuery: (_input?: unknown, _opts?: { enabled?: boolean }) =>
        useStoreSelector((s) => s.estimates),
    },
    saveEstimate: {
      useMutation: (opts?: MutationOptions<SavedEstimateRecord>) =>
        createMutation(({ name, input }: { name: string; input: CalculatorInput }) => {
          const result = calculateWallpaper(input);
          const store = readStore();
          const newId = Math.max(0, ...store.estimates.map((e) => e.id)) + 1;
          const record: SavedEstimateRecord = {
            id: newId,
            name,
            method: input.method,
            input,
            result,
            createdAt: new Date().toISOString(),
          };
          writeStore((prev) => ({
            ...prev,
            estimates: [record, ...prev.estimates],
          }));
          return record;
        }, opts),
    },
    deleteEstimate: {
      useMutation: (opts?: MutationOptions<{ ok: true }>) =>
        createMutation(({ id }: { id: number }) => {
          writeStore((prev) => ({
            ...prev,
            estimates: prev.estimates.filter((e) => e.id !== id),
          }));
          return { ok: true as const };
        }, opts),
    },
  },

  invites: {
    listMine: {
      useQuery: (_input?: unknown, _opts?: { enabled?: boolean }) =>
        useStoreSelector((s) => s.invites),
    },
    create: {
      useMutation: (
        opts?: MutationOptions<{ email: string; acceptPath: string }>
      ) =>
        createMutation(
          ({
            email,
            role,
            guideSlug,
            note,
          }: {
            email: string;
            role: "installer" | "reviewer";
            guideSlug?: "paste-the-wall" | "peel-and-stick";
            note?: string;
          }) => {
            const store = readStore();
            const newId = Math.max(0, ...store.invites.map((i) => i.id)) + 1;
            const token = `unitec-inv-${newId}-${Math.random().toString(36).slice(2, 8)}`;
            const record: TeamInviteRecord = {
              id: newId,
              email,
              role,
              guideSlug: guideSlug ?? null,
              note: note ?? null,
              status: "pending",
              token,
              createdAt: new Date().toISOString(),
            };
            writeStore((prev) => ({
              ...prev,
              invites: [record, ...prev.invites],
            }));
            return {
              email,
              acceptPath: `/studio?invite=${token}`,
            };
          },
          opts
        ),
    },
    accept: {
      useMutation: (opts?: MutationOptions<{ email: string; role: string }>) =>
        createMutation(({ token }: { token: string }) => {
          let foundEmail = "installer@unitecusadesign.com";
          let foundRole = "installer";
          writeStore((prev) => ({
            ...prev,
            invites: prev.invites.map((inv) => {
              if (inv.token === token) {
                foundEmail = inv.email;
                foundRole = inv.role;
                return { ...inv, status: "accepted" as const };
              }
              return inv;
            }),
          }));
          return { email: foundEmail, role: foundRole };
        }, opts),
    },
    revoke: {
      useMutation: (opts?: MutationOptions<{ ok: true }>) =>
        createMutation(({ id }: { id: number }) => {
          writeStore((prev) => ({
            ...prev,
            invites: prev.invites.map((inv) =>
              inv.id === id ? { ...inv, status: "revoked" as const } : inv
            ),
          }));
          return { ok: true as const };
        }, opts),
    },
  },

  assets: {
    listMine: {
      useQuery: (_input?: unknown, _opts?: { enabled?: boolean }) =>
        useStoreSelector((s) => s.assets),
    },
    upload: {
      useMutation: (opts?: MutationOptions<UploadedAssetRecord>) =>
        createMutation(
          ({
            fileName,
            mimeType,
            base64Data,
          }: {
            fileName: string;
            mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
            base64Data: string;
            guideId?: number;
          }) => {
            const store = readStore();
            const newId = Math.max(0, ...store.assets.map((a) => a.id)) + 1;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            const sizeBytes = Math.round((base64Data.length * 3) / 4);
            const record: UploadedAssetRecord = {
              id: newId,
              fileName,
              mimeType,
              sizeBytes,
              url: dataUrl,
              createdAt: new Date().toISOString(),
            };
            writeStore((prev) => ({
              ...prev,
              assets: [record, ...prev.assets],
            }));
            return record;
          },
          opts
        ),
    },
  },
};
