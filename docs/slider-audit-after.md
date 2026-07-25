# Slider audit (after — Plano V3)

Look: `studio`, camera locked, auto-spin off.
Threshold: MAD < **0.15** ⇒ dead / effectively dead.

Methodology (V3.4):
- `dof-focus` / `ascii-cell` audited with parent slider pinned at max.
- `afterimage` audited over 8 motion frames (not a single still).
- Both engines: `physical` and `custom`.

## Engine: `physical`

| slider | mudou? | MAD | MAD before (V0 physical) | observação |
| --- | --- | --- | --- | --- |
| `dispersion` | sim | 0.5316 | 0.2823 | MAD=0.5316 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 7.6128 | 1.6988 | MAD=7.6128 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 53.0394 | 2.5345 | MAD=53.0394 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | sim | 3.7647 | 0.0015 | MAD=3.7647 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 18.7759 | 5.4804 | MAD=18.7759 @ 960×540 (static; min=0 max=1) |
| `speckle` | sim | 1.1814 | 0.1755 | MAD=1.1814 @ 960×540 (static; min=0 max=1) |
| `caustics` | sim | 2.5731 | 0.0000 | MAD=2.5731 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 44.3331 | 9.2826 | MAD=44.3331 @ 960×540 (static; min=0 max=1.5) |
| `glare` | sim | 15.6562 | 0.4237 | MAD=15.6562 @ 960×540 (static; min=0 max=1.5) |
| `flare` | sim | 86.3354 | 0.1931 | MAD=86.3354 @ 960×540 (static; min=0 max=1.5) |
| `dof` | sim | 0.4405 | 0.1164 | MAD=0.4405 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | sim | 0.5527 | 0.0000 | MAD=0.5527 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 13.8507 | 0.0000 | MAD=13.8507 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 32.5636 | 4.9070 | MAD=32.5636 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 117.4477 | 6.2202 | MAD=117.4477 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 22.3187 | 0.0000 | MAD=22.3187 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | sim | 2.2076 | 0.1116 | MAD=2.2076 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 20.0478 | 0.2966 | MAD=20.0478 @ 960×540 (static; min=0 max=1) |
| `grain` | sim | 0.3309 | 0.2069 | MAD=0.3309 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 61.7375 | 12.4299 | MAD=61.7375 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 11.7816 | 0.0000 | MAD=11.7816 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | sim | 0.9035 | 0.0807 | MAD=0.9035 @ 960×540 (static; min=0.25 max=1) |

Dead / weak: **0** / 22

## Engine: `custom`

| slider | mudou? | MAD | MAD before (V0 physical) | observação |
| --- | --- | --- | --- | --- |
| `dispersion` | **não** | 0.0600 | 0.2823 | MAD=0.0600 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 3.8846 | 1.6988 | MAD=3.8846 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 2.0507 | 2.5345 | MAD=2.0507 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | **não** | 0.0615 | 0.0015 | MAD=0.0615 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 8.8317 | 5.4804 | MAD=8.8317 @ 960×540 (static; min=0 max=1) |
| `speckle` | **não** | 0.0193 | 0.1755 | MAD=0.0193 @ 960×540 (static; min=0 max=1) |
| `caustics` | **não** | 0.0195 | 0.0000 | MAD=0.0195 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 11.3710 | 9.2826 | MAD=11.3710 @ 960×540 (static; min=0 max=1.5) |
| `glare` | sim | 3.4074 | 0.4237 | MAD=3.4074 @ 960×540 (static; min=0 max=1.5) |
| `flare` | sim | 84.5564 | 0.1931 | MAD=84.5564 @ 960×540 (static; min=0 max=1.5) |
| `dof` | **não** | 0.0875 | 0.1164 | MAD=0.0875 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | **não** | 0.1216 | 0.0000 | MAD=0.1216 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 2.4219 | 0.0000 | MAD=2.4219 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 8.0127 | 4.9070 | MAD=8.0127 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 138.1908 | 6.2202 | MAD=138.1908 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 29.1811 | 0.0000 | MAD=29.1811 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | **não** | 0.0864 | 0.1116 | MAD=0.0864 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 19.0006 | 0.2966 | MAD=19.0006 @ 960×540 (static; min=0 max=1) |
| `grain` | **não** | 0.1125 | 0.2069 | MAD=0.1125 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 44.1965 | 12.4299 | MAD=44.1965 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 2.2320 | 0.0000 | MAD=2.2320 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | **não** | 0.0000 | 0.0807 | MAD=0.0000 @ 960×540 (static; min=0.25 max=1) |

Dead / weak: **9** / 22

### Still open

- `dispersion` — MAD=0.0600 @ 960×540 (static; min=0 max=2.5)
- `roughness` — MAD=0.0615 @ 960×540 (static; min=0 max=0.35)
- `speckle` — MAD=0.0193 @ 960×540 (static; min=0 max=1)
- `caustics` — MAD=0.0195 @ 960×540 (static; min=0 max=1)
- `dof` — MAD=0.0875 @ 960×540 (static; min=0 max=1)
- `dof-focus` — MAD=0.1216 @ 960×540 (parent=dof@max; min=1.5 max=10)
- `chroma` — MAD=0.0864 @ 960×540 (static; min=0 max=1.5)
- `grain` — MAD=0.1125 @ 960×540 (static; min=0 max=1)
- `transmission-scale` — MAD=0.0000 @ 960×540 (static; min=0.25 max=1)

## Classification

- Methodology artifacts fixed above should no longer appear as false dead for dof-focus / ascii-cell / afterimage.
- Remaining DEAD/WEAK rows are real product bugs or known capture limits (`dpr` if buffer path ignores resize).
