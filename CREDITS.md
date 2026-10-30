# Credits and source provenance

## New paste-the-wall lesson

`src/wallpaper/guide.ts` contains the evidence register and the scope of each source.

- Graham & Brown, [How to Hang Wallpaper](https://www.grahambrown.com/us/how-to/hang-wallpaper/): general paste-the-wall preparation, plumb line, paste application, dry-drop hanging, smoothing, trimming, matching, outlet and cleaning guidance.
- ROMAN Decorating Products, [Can I Use the Paste-the-Wall Technique to Hang Wallpaper?](https://romandecoratingproducts.com/blogs/knowledge/paste-the-wall-technique-to-hang-wallpaper): substrate preparation, primer requirements, slightly oversized paste lanes, smoothing, trimming and pattern matching.
- ROMAN Decorating Products, [PRO-838 Heavy Duty Clear Adhesive product information](https://images.thdstatic.com/catalog/pdfImages/88/88936571-5292-4372-b150-378b0708cde6.pdf): only the principle of removing excess adhesive before it dries, not universal adhesive selection.
- PLUMB reconstructed training wall: the room, outlet, tools, botanical pattern, 53 cm example drop and animation are reconstructed teaching graphics, not manufacturer drawings or a product specification.

The supplied Kami viewer requires sign-in. Its document has not been reviewed and is not cited as a source. Product roll labels, adhesive datasheets, site risk assessment and qualified electrical requirements take precedence.

## Earlier wallpaper learning references

Earlier guide source publishers and URLs are embedded in `contracts/guides/shared.ts` and displayed in their source registers. They remain general references unless a source explicitly applies to the specified product.

## UNITEC product imagery and documents

The following official catalogue images are stored for the client pilot. Copyright and product imagery rights remain with UNITEC or their respective owners. Inclusion is not endorsement or installation approval. Confirm final usage rights before public release.

### WPC Choco Mix (19), SKU 14122019

- Product page: https://www.unitecusadesign.com/productos/panel-wpc-choco-mix-19/
- Source image: `public/products/14122019.webp`
- Derived material: `public/products/14122019-wood.jpg`
- Derivation: perspective rectification and conservative cleanup of one raised wood-look face from the official photograph; adjacent channel removed. No unrelated wood image substituted.
- Related technical sheet: https://www.unitecusadesign.com/fichas/Paneles_WPC_Interior_Platinas_y_Angulos.pdf
- Documented component: concealed stainless-steel fixing clip reference `14122902` for the interior WPC/PVC panel family. Spacing and a complete fixing procedure are not inferred.

### Lámina Mármol Eclipse M-11, SKU 14121211

- Product page: https://www.unitecusadesign.com/productos/lamina-marmol-eclipse-m-11/
- Source/surface image: `public/products/14121211.webp`
- Related technical sheet: https://www.unitecusadesign.com/fichas/Paneles_Acrilicos_Marmol.pdf
- Use: source-based colour/diffuse surface with reconstructed physical clear-coat response. No complete adhesive or installation method is inferred.

### Panel Acolchado DuoSmall Vainilla (820), SKU 14126406

- Product page: https://www.unitecusadesign.com/productos/panel-acolchado-duosmall-vainilla-820/
- Source image: `public/products/14126406.webp`
- Derived surface: `public/products/14126406-surface.jpg` — Lanczos resampling of the narrow official source for stable GPU sampling, not added source detail.
- Reconstructed micro-detail: `public/products/14126406-fabric-bump.png` and deterministic runtime weave generation. This is not a manufacturer PBR scan.
- Related technical sheet: https://www.unitecusadesign.com/fichas/Paredes_y_Paneles_Acolchados.pdf

## Interaction and architecture references

- [Flat Pack](https://sael.net/flatpack/?ref=gunpla): studied for side-by-side manual/scene navigation, step controls and separation between source material and reconstructed interaction. No code or artwork copied.
- [Nutlope/bygga](https://github.com/Nutlope/bygga): studied for single-plan architecture, deterministic step states, per-step tools/warnings and print output. Its MIT license was verified; no code was copied into the new module.
- [loloop00/3D-IKEA-instructions](https://github.com/loloop00/3D-IKEA-instructions): earlier close-up/loupe and leader-line reference.
- [gkjohnson/three-edge-projection](https://github.com/gkjohnson/three-edge-projection), [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) and [OmarShehata/webgl-outlines](https://github.com/OmarShehata/webgl-outlines): earlier CAD rendering references; check and retain their licenses for any reused code.

## Open-source runtime

React, Three.js, Vite, Mediabunny, Lucide and other package dependencies retain their respective licenses in `node_modules` and package metadata. Three.js addons are imported from the installed package rather than copied from an unverified source.
