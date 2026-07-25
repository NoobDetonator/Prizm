# Slider audit (after — Plano V2)

Look: `studio`, camera locked, auto-spin off.
Method: set slider min → capture RGBA → set max → capture → mean absolute channel difference (MAD).
Threshold: MAD < **0.15** ⇒ dead / effectively dead.
Engine: demo default (`physical` via `createPrism`).

| slider | mudou? | MAD after | MAD before | Δ MAD | observação |
| --- | --- | --- | --- | --- | --- |
| `dispersion` | sim | 0.3708 | 0.2823 | 0.0885 | MAD=0.3708 @ 960×540 (min=0 max=2.5) |
| `thickness` | sim | 6.6616 | 1.6988 | 4.9628 | MAD=6.6616 @ 960×540 (min=0.1 max=3) |
| `ior` | sim | 54.1142 | 2.5345 | 51.5797 | MAD=54.1142 @ 960×540 (min=1.1 max=2.4) |
| `roughness` | **não** | 0.1130 | 0.0015 | 0.1115 | MAD=0.1130 @ 960×540 (min=0 max=0.35) |
| `translucency` | sim | 19.6610 | 5.4804 | 14.1806 | MAD=19.6610 @ 960×540 (min=0 max=1) |
| `speckle` | **não** | 0.0528 | 0.1755 | -0.1227 | MAD=0.0528 @ 960×540 (min=0 max=1) |
| `caustics` | sim | 2.2494 | 0.0000 | 2.2494 | MAD=2.2494 @ 960×540 (min=0 max=1) |
| `bloom` | sim | 51.6778 | 9.2826 | 42.3952 | MAD=51.6778 @ 960×540 (min=0 max=1.5) |
| `glare` | sim | 15.0848 | 0.4237 | 14.6611 | MAD=15.0848 @ 960×540 (min=0 max=1.5) |
| `flare` | sim | 84.9909 | 0.1931 | 84.7978 | MAD=84.9909 @ 960×540 (min=0 max=1.5) |
| `dof` | sim | 0.3594 | 0.1164 | 0.2430 | MAD=0.3594 @ 960×540 (min=0 max=1) |
| `dof-focus` | **não** | 0.0000 | 0.0000 | 0.0000 | MAD=0.0000 @ 960×540 (min=1.5 max=10) |
| `afterimage` | **não** | 0.0000 | 0.0000 | 0.0000 | MAD=0.0000 @ 960×540 (min=0 max=1) |
| `halftone` | sim | 32.3704 | 4.9070 | 27.4634 | MAD=32.3704 @ 960×540 (min=0 max=1) |
| `ascii` | sim | 113.9314 | 6.2202 | 107.7112 | MAD=113.9314 @ 960×540 (min=0 max=1) |
| `ascii-cell` | **não** | 0.0000 | 0.0000 | 0.0000 | MAD=0.0000 @ 960×540 (min=4 max=28) |
| `chroma` | sim | 2.2209 | 0.1116 | 2.1093 | MAD=2.2209 @ 960×540 (min=0 max=1.5) |
| `vignette` | sim | 19.4118 | 0.2966 | 19.1152 | MAD=19.4118 @ 960×540 (min=0 max=1) |
| `grain` | sim | 0.3248 | 0.2069 | 0.1179 | MAD=0.3248 @ 960×540 (min=0 max=1) |
| `exposure` | sim | 62.9378 | 12.4299 | 50.5079 | MAD=62.9378 @ 960×540 (min=0.4 max=2.2) |
| `dpr` | **não** | 0.0000 | 0.0000 | 0.0000 | MAD=0.0000 @ 960×540 (min=1 max=2) |
| `transmission-scale` | sim | 1.2730 | 0.0807 | 1.1923 | MAD=1.2730 @ 960×540 (min=0.25 max=1) |

Dead / weak count: **6** / 22

## Open bugs (MAD ≈ 0)

- `roughness` — MAD=0.1130 @ 960×540 (min=0 max=0.35)
- `speckle` — MAD=0.0528 @ 960×540 (min=0 max=1)
- `dof-focus` — MAD=0.0000 @ 960×540 (min=1.5 max=10)
- `afterimage` — MAD=0.0000 @ 960×540 (min=0 max=1)
- `ascii-cell` — MAD=0.0000 @ 960×540 (min=4 max=28)
- `dpr` — MAD=0.0000 @ 960×540 (min=1 max=2)

## Notas

- Any slider with MAD ≈ 0 is an **open bug**, not a completed checklist item.
- `dpr` may report low MAD if capture path re-reads at the same buffer size.
- Re-run with engine=`custom` separately if comparing custom roughness / dispersion.
