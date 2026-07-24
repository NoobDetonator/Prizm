# Slider audit (before)

Look: `studio`, camera locked, auto-spin off.
Method: set slider min → capture RGBA → set max → capture → mean absolute channel difference (MAD).
Threshold: MAD < **0.15** ⇒ dead / effectively dead.

| slider | mudou? | observação |
| --- | --- | --- |
| `dispersion` | sim | MAD=0.2823 @ 960×540 (min=0 max=2.5) |
| `thickness` | sim | MAD=1.6988 @ 960×540 (min=0.1 max=3) |
| `ior` | sim | MAD=2.5345 @ 960×540 (min=1.1 max=2.4) |
| `roughness` | **não** | MAD=0.0015 @ 960×540 (min=0 max=0.35) |
| `translucency` | sim | MAD=5.4804 @ 960×540 (min=0 max=1) |
| `speckle` | sim | MAD=0.1755 @ 960×540 (min=0 max=1) |
| `caustics` | **não** | MAD=0.0000 @ 960×540 (min=0 max=1) |
| `bloom` | sim | MAD=9.2826 @ 960×540 (min=0 max=1.5) |
| `glare` | sim | MAD=0.4237 @ 960×540 (min=0 max=1.5) |
| `flare` | sim | MAD=0.1931 @ 960×540 (min=0 max=1.5) |
| `dof` | **não** | MAD=0.1164 @ 960×540 (min=0 max=1) |
| `dof-focus` | **não** | MAD=0.0000 @ 960×540 (min=1.5 max=10) |
| `afterimage` | **não** | MAD=0.0000 @ 960×540 (min=0 max=1) |
| `halftone` | sim | MAD=4.9070 @ 960×540 (min=0 max=1) |
| `ascii` | sim | MAD=6.2202 @ 960×540 (min=0 max=1) |
| `ascii-cell` | **não** | MAD=0.0000 @ 960×540 (min=4 max=28) |
| `chroma` | **não** | MAD=0.1116 @ 960×540 (min=0 max=1.5) |
| `vignette` | sim | MAD=0.2966 @ 960×540 (min=0 max=1) |
| `grain` | sim | MAD=0.2069 @ 960×540 (min=0 max=1) |
| `exposure` | sim | MAD=12.4299 @ 960×540 (min=0.4 max=2.2) |
| `dpr` | **não** | MAD=0.0000 @ 960×540 (min=1 max=2) |
| `transmission-scale` | **não** | MAD=0.0807 @ 960×540 (min=0.25 max=1) |

Dead / weak count: **9** / 22

## Notas

- `dpr` always changes resolution sampling — expected alive.
- Effects clipped by selective cube mask may still change *cube* pixels while looking wrong on the full frame (e.g. vignette, glare spill).
- Re-run after Phase 1–2 fixes.
