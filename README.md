# PLUMB × UNITEC USA — 2D Blueprint & 3D Step-by-Step Field Manual (`step-by-step-manual-2D`)

Interactive **2D Orthographic Blueprint + 3D PBR Installation Manual, Material Lab, Roll & Panel Calculator, and Authoring Studio** built for **UNITEC USA Design** (`unitecusadesign.com`) and architectural wallcovering installations.

---

## Key Capabilities

1. **Synchronized 3-Mode Visualization (`2D Blueprint` · `3D Drawing` · `3D Realistic`)**:
   - **2D Blueprint Mode (`src/scene/renderBlueprint2D.ts`)**: Live CAD orthographic wall elevation, Section A-A substrate/joint profile (Scale 1:2), true vertical laser plumb line, dimension callouts, and step telemetry.
   - **3D Drawing Mode**: Architectural technical line-art perspective with orbit camera controls.
   - **3D Realistic Mode (`src/scene/WallpaperScene.ts` & `src/scene/PanelTrainingScene.ts`)**: Physically based Three.js scenes mapped to authentic UNITEC USA product geometry and textures.

2. **5 Complete Step-by-Step Installation Manuals**:
   - **Wallcoverings (Approved V1)**:
     - `paste-the-wall` — 12-step non-woven dry-hang installation with electrical & surface safety gates.
     - `peel-and-stick` — 12-step self-adhesive installation with compatibility gate and incremental liner release.
   - **UNITEC USA 3-Material Fidelity Pilot (`/materials`)**:
     - **SKU `14122019`** — *WPC Choco Mix (19)* (`16 × 295 cm · 25 mm` interior fluted panel + concealed clip ref. `14122902`).
     - **SKU `14121211`** — *Lámina Mármol Eclipse M-11* (`122 × 244 cm · 3 mm` high-gloss UV PVC marble sheet).
     - **SKU `14126406`** — *Panel Acolchado DuoSmall Vainilla (820)* (`20 × 110 cm · 25 mm` arch-topped upholstered decorative module).

3. **Dual Calculator (`/calculator`)**:
   - **Wallcovering Roll & Pattern Calculator**: Computes full-width drops, repeat rounding (`free`, `straight`, `offset`), conservative opening deductions, and roll counts.
   - **UNITEC USA Panel & Sheet Estimator**: Computes exact panels/sheets, factory packs, concealed clips (`14122902`), adhesive cartridges, and reference costs.

4. **Field Studio (`/studio`) with Instant Demo Role Switcher**:
   - Zero external login barriers: switch between **Demo: Admin / Reviewer**, **Demo: Lead Installer**, and **Guest** right from the header to create drafts, edit steps, submit for moderation review, approve versions, manage team invites, and export **Printable Field Sheets** or **1080p30 H.264 MP4 Videos**.

---

## Quick Start

```bash
npm install
npm test
npm run build
npm run dev
```
