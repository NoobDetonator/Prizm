# Slider audit

Look: `studio`, camera locked, auto-spin off.
Threshold: MAD < **0.15** ⇒ dead / effectively dead.

Methodology:
- `dof-focus` / `ascii-cell` audited with parent slider pinned at max.
- `afterimage` audited over 8 motion frames (not a single still).
- Both engines: `physical` and `custom`.
- Removed passes (not audited): `glare`, `flare` — deleted in `bff9915`.
- `transmission-scale` is **N/A** on `custom` (PhysicalMaterial only).

## Engine: `physical`

| slider | mudou? | MAD | observação |
| --- | --- | --- | --- |
| `dispersion` | sim | 0.7061 | MAD=0.7061 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 5.0622 | MAD=5.0622 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 13.8907 | MAD=13.8907 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | sim | 3.4235 | MAD=3.4235 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 13.2589 | MAD=13.2589 @ 960×540 (static; min=0 max=1) |
| `speckle` | sim | 0.4916 | MAD=0.4916 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 45.8242 | MAD=45.8242 @ 960×540 (static; min=0 max=1.5) |
| `dof` | sim | 1.2600 | MAD=1.2600 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | sim | 1.5045 | MAD=1.5045 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 5.2113 | MAD=5.2113 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 17.4386 | MAD=17.4386 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 41.5667 | MAD=41.5667 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 13.3655 | MAD=13.3655 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | sim | 0.6994 | MAD=0.6994 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 2.7369 | MAD=2.7369 @ 960×540 (static; min=0 max=1) |
| `grain` | sim | 0.4511 | MAD=0.4511 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 27.6214 | MAD=27.6214 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 20.2363 | MAD=20.2363 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | sim | 0.8754 | MAD=0.8754 @ 960×540 (static; min=0.25 max=1) |

Dead / weak: **0** / 19

## Engine: `custom`

| slider | mudou? | MAD | observação |
| --- | --- | --- | --- |
| `dispersion` | **não** | 0.1458 | MAD=0.1458 @ 960×540 (static; min=0 max=2.5) |
| `thickness` | sim | 2.9057 | MAD=2.9057 @ 960×540 (static; min=0.1 max=3) |
| `ior` | sim | 2.1062 | MAD=2.1062 @ 960×540 (static; min=1.1 max=2.4) |
| `roughness` | **não** | 0.0793 | MAD=0.0793 @ 960×540 (static; min=0 max=0.35) |
| `translucency` | sim | 4.7786 | MAD=4.7786 @ 960×540 (static; min=0 max=1) |
| `speckle` | **não** | 0.0266 | MAD=0.0266 @ 960×540 (static; min=0 max=1) |
| `bloom` | sim | 42.9485 | MAD=42.9485 @ 960×540 (static; min=0 max=1.5) |
| `dof` | sim | 1.1401 | MAD=1.1401 @ 960×540 (static; min=0 max=1) |
| `dof-focus` | sim | 1.3819 | MAD=1.3819 @ 960×540 (parent=dof@max; min=1.5 max=10) |
| `afterimage` | sim | 2.8198 | MAD=2.8198 @ 960×540 (temporal+motion; min=0 max=1) |
| `halftone` | sim | 4.2240 | MAD=4.2240 @ 960×540 (static; min=0 max=1) |
| `ascii` | sim | 55.5130 | MAD=55.5130 @ 960×540 (static; min=0 max=1) |
| `ascii-cell` | sim | 18.6385 | MAD=18.6385 @ 960×540 (parent=ascii@max; min=4 max=28) |
| `chroma` | sim | 0.2179 | MAD=0.2179 @ 960×540 (static; min=0 max=1.5) |
| `vignette` | sim | 2.1894 | MAD=2.1894 @ 960×540 (static; min=0 max=1) |
| `grain` | sim | 0.3341 | MAD=0.3341 @ 960×540 (static; min=0 max=1) |
| `exposure` | sim | 18.7105 | MAD=18.7105 @ 960×540 (static; min=0.4 max=2.2) |
| `dpr` | sim | 17.8097 | MAD=17.8097 @ 960×540 (static; min=1 max=2) |
| `transmission-scale` | N/A | N/A | N/A no engine custom — só MeshPhysicalMaterial.transmission |

Dead / weak: **3** / 18

### Still open

- `dispersion` — MAD=0.1458 @ 960×540 (static; min=0 max=2.5)
- `roughness` — MAD=0.0793 @ 960×540 (static; min=0 max=0.35)
- `speckle` — MAD=0.0266 @ 960×540 (static; min=0 max=1)

## Classification

- `glare` / `flare`: **pass removido em `bff9915`** — não são bugs de slider.
- `transmission-scale` no custom: N/A, não bug.
- Remaining DEAD/WEAK rows (if any) are real product gaps.
