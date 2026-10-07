# Design QA

**Findings**

- No actionable P0, P1, or P2 differences remain. The page follows the selected light editorial reference: global network hero, search panel, capability tabs, five-step method, scenario carousel, commitments, and consultation form.

**Evidence and comparison setup**

- Source visual truth: `C:\Users\Abhinav Saxena\.codex\generated_images\01a11558-700b-7df3-a656-7398b0a560b1\exec-ed3638c8-b7af-48dc-90c2-9bf3c9aeee26.png` (866 × 1816 px).
- Browser-rendered implementation: `qa/desktop-full.png` (1440 px CSS viewport, device scale factor 1; normalized to 866 × 1781 px for comparison) and `qa/mobile-full.png` (390 px CSS viewport, device scale factor 1).
- Full-view side-by-side comparison: `qa/comparison.png`, source left and implementation right, each 866 px wide. State: default home page, first capability and first scenario selected, all images loaded.
- Focused hero evidence: `qa/desktop-hero.png` and `qa/hero-1440-check.png`, `qa/hero-1024-check.png`, `qa/hero-768-check.png`, `qa/hero-390-check.png`. The Rio photo is rendered at its complete aspect ratio without cropping; at narrow widths it becomes a full-width image band below the headline.
- Focused control/form details were checked in the browser interaction pass. The full-view comparison was supplemented by the desktop hero and mobile capture because the global image treatment and narrow layout are the highest fidelity risks.

**Required fidelity surfaces**

- Fonts and typography: Cormorant Garamond display type and DM Sans interface type preserve the editorial hierarchy. The hero headline wraps to two lines at desktop, like the source. Small labels remain legible and there is no truncation of primary copy.
- Spacing and layout rhythm: the same section order, two-column capability composition, five-step sequence, overlapping search panel, and long-form carousel are present. The normalized implementation is 35 px shorter than the reference, a small difference over the full page.
- Colors and visual tokens: warm ivory, dark forest green, muted slate text, pale green panels, and restrained translucency align with the reference. The implementation is slightly cooler in some white spaces, accepted as a minor art-direction variation.
- Image quality and asset fidelity: generated landscape imagery has the reference's soft cinematic tone; no people or portrait cards appear. The hero image is fully rendered and decoded at 1254 × 705 natural pixels. The world map and moving network connections sit above it. The reference's exact photography is unavailable, so scene details differ while the composition is retained.
- Copy and content: the core headings, capability subjects, process, illustrative situations, commitments, and consultation intent are represented. Some supporting copy is shorter for legibility. The site labels scenarios as illustrative and describes the consultation form's current browser-only behavior.

**Comparison history**

1. Initial capture: the hero image was cropped at some widths, the headline rhythm differed, and lower images had not finished loading in the QA screenshot. Fixed by using contained hero sizing with responsive placement, widening the desktop headline measure, and scrolling/decoding images before capture.
2. Revised capture: `qa/hero-1440-check.png`, `qa/hero-1024-check.png`, `qa/hero-768-check.png`, and `qa/hero-390-check.png` show the entire image with zero horizontal overflow. `qa/comparison.png` shows the complete page with all section images loaded.
3. Final production capture: `qa/desktop-full.png`, `qa/desktop-hero.png`, and `qa/mobile-full.png` were captured from the optimized build. Search/filter, tabs, carousel, consultation preview, mobile menu, and reduced-motion state passed. Console errors and failed resources: none.

**Open Questions**

- Final public claims, jurisdiction coverage, and the minimum mandate threshold need business verification before publication.
- Consultation delivery needs a backend or approved destination before real inquiries can be submitted.

**Implementation Checklist**

- [x] Complete responsive hero image and animated network overlay.
- [x] Complete all selected page sections with functional controls.
- [x] Browser QA at desktop and mobile widths; no horizontal overflow.
- [x] TypeScript check and optimized production build.

**Follow-up Polish**

- [P3] If exact photographic fidelity becomes important, commission or license imagery that matches the reference frame more closely.

final result: passed
