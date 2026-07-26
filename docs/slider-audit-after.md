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
| `dispersion` | sim | 0.2778 | 0.2823 | MAD=0.2778 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 3.5577 | 1.6988 | MAD=3.5577 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 12.9674 | 2.5345 | MAD=12.9674 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | sim | 3.7586 | 0.0015 | MAD=3.7586 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 15.9960 | 5.4804 | MAD=15.9960 @ 960×540 (static; min=0 max=1) |
| `speckle` | sim | 0.3132 | 0.1755 | MAD=0.3132 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 43.6964 | 9.2826 | MAD=43.6964 @ 960×540 (static; min=0 max=1.5) |
| `dof` | sim | 1.1857 | 0.1164 | MAD=1.1857 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | sim | 1.3208 | 0.0000 | MAD=1.3208 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 4.9859 | 0.0000 | MAD=4.9859 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 17.8617 | 4.9070 | MAD=17.8617 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 41.5664 | 6.2202 | MAD=41.5664 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 13.0844 | 0.0000 | MAD=13.0844 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | sim | 0.6778 | 0.1116 | MAD=0.6778 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 3.6981 | 0.2966 | MAD=3.6981 @ 960×540 (static; min=0 max=1) |
| `grain` | sim | 0.4450 | 0.2069 | MAD=0.4450 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 35.5354 | 12.4299 | MAD=35.5354 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 39.2281 | 0.0000 | MAD=39.2281 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | sim | 0.9521 | 0.0807 | MAD=0.9521 @ 960×540 (static; min=0.25 max=1) |

Dead / weak: **0** / 19

## Engine: `custom`

| slider | mudou? | MAD | MAD before (V0 physical) | observação |
| --- | --- | --- | --- | --- |
| `dispersion` | sim | 0.2835 | 0.2823 | MAD=0.2835 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 5.4811 | 1.6988 | MAD=5.4811 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 6.8153 | 2.5345 | MAD=6.8153 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | sim | 0.2983 | 0.0015 | MAD=0.2983 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 3.4496 | 5.4804 | MAD=3.4496 @ 960×540 (static; min=0 max=1) |
| `speckle` | **não** | 0.1330 | 0.1755 | MAD=0.1330 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 19.9221 | 9.2826 | MAD=19.9221 @ 960×540 (static; min=0 max=1.5) |
| `dof` | sim | 1.2081 | 0.1164 | MAD=1.2081 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | sim | 1.7717 | 0.0000 | MAD=1.7717 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 10.4267 | 0.0000 | MAD=10.4267 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 27.0106 | 4.9070 | MAD=27.0106 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 41.1944 | 6.2202 | MAD=41.1944 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 9.6791 | 0.0000 | MAD=9.6791 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | sim | 0.3443 | 0.1116 | MAD=0.3443 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 3.0933 | 0.2966 | MAD=3.0933 @ 960×540 (static; min=0 max=1) |
| `grain` | sim | 0.3162 | 0.2069 | MAD=0.3162 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 37.1108 | 12.4299 | MAD=37.1108 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 25.6264 | 0.0000 | MAD=25.6264 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | **não** | 0.0000 | 0.0807 | MAD=0.0000 @ 960×540 (static; min=0.25 max=1) |

Dead / weak: **2** / 19

### Still open

- `speckle` — MAD=0.1330 @ 960×540 (static; min=0 max=1)
- `transmission-scale` — MAD=0.0000 @ 960×540 (static; min=0.25 max=1)

## Classification

- Methodology artifacts fixed above should no longer appear as false dead for dof-focus / ascii-cell / afterimage.
- Remaining DEAD/WEAK rows are real product bugs or known capture limits (`dpr` if buffer path ignores resize).
