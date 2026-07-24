/**
 * Named procedural float-HDR recipes for glass IBL.
 * Values are linear radiance (can be >> 1).
 */

export const PROCEDURAL_ENV_PRESETS = {
  spectral: {
    id: 'spectral',
    label: 'Spectral blades',
    note: 'default · rainbow slits + hot suns',
    fill: [0.008, 0.012, 0.028],
    pockets: [
      { x: 0.2, y: 0.32, r: 0.3, rgb: [0.35, 0.85, 2.4], gain: 1.8 },
      { x: 0.8, y: 0.56, r: 0.26, rgb: [2.2, 0.55, 0.28], gain: 1.4 },
    ],
    blades: [
      { x: 0.16, w: 0.04, peak: [1.2, 4.5, 18], edge: [0.05, 0.2, 0.8] },
      { x: 0.3, w: 0.022, peak: [18, 6, 1.5], edge: [0.7, 0.15, 0.04] },
      { x: 0.46, w: 0.055, peak: [22, 22, 25], edge: [0.5, 0.35, 1.2] },
      { x: 0.6, w: 0.02, peak: [20, 4, 0.8], edge: [0.6, 0.1, 0.03] },
      { x: 0.74, w: 0.032, peak: [1, 18, 16], edge: [0.02, 0.7, 0.65] },
      { x: 0.87, w: 0.016, peak: [18, 2.5, 6], edge: [0.7, 0.05, 0.2] },
    ],
    suns: [
      { x: 0.5, y: 0.24, r: 0.07, rgb: [80, 80, 80], gain: 1 },
      { x: 0.27, y: 0.84, r: 0.05, rgb: [55, 38, 18], gain: 1 },
      { x: 0.7, y: 0.76, r: 0.045, rgb: [22, 40, 60], gain: 1 },
    ],
  },

  midnight: {
    id: 'midnight',
    label: 'Midnight void',
    note: 'deep navy · thin cyan needles',
    fill: [0.002, 0.004, 0.018],
    pockets: [
      { x: 0.35, y: 0.4, r: 0.45, rgb: [0.05, 0.12, 0.55], gain: 1.2 },
      { x: 0.75, y: 0.62, r: 0.28, rgb: [0.25, 0.05, 0.4], gain: 0.9 },
    ],
    blades: [
      { x: 0.22, w: 0.012, peak: [0.4, 8, 22], edge: [0.02, 0.15, 0.6] },
      { x: 0.48, w: 0.018, peak: [2, 14, 28], edge: [0.05, 0.3, 0.9] },
      { x: 0.66, w: 0.01, peak: [10, 4, 18], edge: [0.3, 0.08, 0.5] },
      { x: 0.84, w: 0.014, peak: [0.8, 16, 20], edge: [0.02, 0.4, 0.7] },
    ],
    suns: [
      { x: 0.55, y: 0.28, r: 0.04, rgb: [30, 55, 90], gain: 1 },
      { x: 0.18, y: 0.72, r: 0.035, rgb: [40, 20, 70], gain: 1 },
    ],
  },

  tungsten: {
    id: 'tungsten',
    label: 'Tungsten studio',
    note: 'warm key · soft amber fills',
    fill: [0.04, 0.025, 0.012],
    pockets: [
      { x: 0.25, y: 0.35, r: 0.38, rgb: [2.8, 1.4, 0.45], gain: 1.6 },
      { x: 0.72, y: 0.55, r: 0.32, rgb: [1.2, 0.55, 0.25], gain: 1.3 },
      { x: 0.5, y: 0.78, r: 0.22, rgb: [0.6, 0.35, 0.2], gain: 1 },
    ],
    blades: [
      { x: 0.38, w: 0.05, peak: [28, 16, 4], edge: [1.2, 0.5, 0.1] },
      { x: 0.58, w: 0.028, peak: [22, 10, 2.5], edge: [0.9, 0.35, 0.08] },
    ],
    suns: [
      { x: 0.42, y: 0.22, r: 0.09, rgb: [90, 55, 18], gain: 1 },
      { x: 0.68, y: 0.3, r: 0.05, rgb: [70, 40, 12], gain: 1 },
      { x: 0.2, y: 0.68, r: 0.06, rgb: [35, 22, 10], gain: 1 },
    ],
  },

  disco: {
    id: 'disco',
    label: 'Disco slits',
    note: 'dense spectral lasers · party glass',
    fill: [0.01, 0.006, 0.02],
    pockets: [
      { x: 0.5, y: 0.45, r: 0.5, rgb: [0.4, 0.1, 0.8], gain: 1.1 },
    ],
    blades: [
      { x: 0.1, w: 0.01, peak: [20, 2, 8], edge: [0.5, 0.05, 0.2] },
      { x: 0.18, w: 0.014, peak: [2, 18, 6], edge: [0.05, 0.5, 0.15] },
      { x: 0.28, w: 0.011, peak: [4, 6, 22], edge: [0.1, 0.15, 0.6] },
      { x: 0.4, w: 0.02, peak: [24, 24, 4], edge: [0.6, 0.5, 0.1] },
      { x: 0.52, w: 0.012, peak: [22, 3, 16], edge: [0.55, 0.08, 0.4] },
      { x: 0.62, w: 0.016, peak: [3, 20, 18], edge: [0.08, 0.5, 0.45] },
      { x: 0.74, w: 0.01, peak: [18, 8, 2], edge: [0.5, 0.2, 0.05] },
      { x: 0.84, w: 0.018, peak: [6, 4, 24], edge: [0.15, 0.1, 0.6] },
      { x: 0.92, w: 0.012, peak: [20, 14, 20], edge: [0.5, 0.35, 0.5] },
    ],
    suns: [
      { x: 0.33, y: 0.2, r: 0.035, rgb: [60, 60, 70], gain: 1 },
      { x: 0.7, y: 0.25, r: 0.03, rgb: [70, 30, 50], gain: 1 },
    ],
  },

  overcast: {
    id: 'overcast',
    label: 'Overcast dome',
    note: 'soft even sky · clean glass study',
    fill: [0.35, 0.38, 0.42],
    pockets: [
      { x: 0.5, y: 0.28, r: 0.55, rgb: [1.8, 1.9, 2.1], gain: 1.4 },
      { x: 0.2, y: 0.65, r: 0.35, rgb: [1.1, 1.15, 1.25], gain: 1 },
      { x: 0.8, y: 0.7, r: 0.3, rgb: [1.3, 1.2, 1.1], gain: 1 },
    ],
    blades: [
      { x: 0.45, w: 0.08, peak: [3.5, 3.6, 3.8], edge: [1.2, 1.25, 1.35] },
    ],
    suns: [
      { x: 0.55, y: 0.18, r: 0.12, rgb: [12, 12, 11], gain: 1 },
    ],
  },

  aurora: {
    id: 'aurora',
    label: 'Aurora wash',
    note: 'soft green/magenta curtains',
    fill: [0.01, 0.02, 0.04],
    pockets: [
      { x: 0.3, y: 0.35, r: 0.42, rgb: [0.2, 2.2, 1.1], gain: 1.7 },
      { x: 0.65, y: 0.4, r: 0.38, rgb: [1.8, 0.3, 1.6], gain: 1.5 },
      { x: 0.5, y: 0.7, r: 0.3, rgb: [0.3, 0.8, 2.0], gain: 1.2 },
    ],
    blades: [
      { x: 0.25, w: 0.06, peak: [0.5, 14, 8], edge: [0.05, 0.4, 0.25] },
      { x: 0.55, w: 0.07, peak: [12, 2, 10], edge: [0.35, 0.08, 0.3] },
      { x: 0.78, w: 0.045, peak: [1, 10, 14], edge: [0.05, 0.3, 0.4] },
    ],
    suns: [
      { x: 0.48, y: 0.22, r: 0.05, rgb: [40, 70, 55], gain: 1 },
    ],
  },

  /**
   * Transparent-void IBL — near-black fill, absurd hot slits for liquid
   * prismatic reflections. Background stays clear; only the crystal reads light.
   */
  liquidVoid: {
    id: 'liquidVoid',
    label: 'Liquid void',
    note: 'black void · absurd spectral slits',
    fill: [0.0004, 0.0005, 0.0008],
    pockets: [
      // Tiny cool/warm whispers — keep body from going pure black in the core
      { x: 0.42, y: 0.48, r: 0.22, rgb: [0.08, 0.12, 0.35], gain: 0.55 },
      { x: 0.62, y: 0.52, r: 0.18, rgb: [0.28, 0.06, 0.12], gain: 0.45 },
    ],
    blades: [
      // Thick white “liquid” ribbon
      { x: 0.5, w: 0.028, peak: [90, 90, 95], edge: [8, 10, 18] },
      // Spectral companions — absurd color splits
      { x: 0.38, w: 0.012, peak: [55, 4, 8], edge: [2, 0.1, 0.2] },
      { x: 0.44, w: 0.01, peak: [40, 28, 2], edge: [1.2, 0.8, 0.05] },
      { x: 0.56, w: 0.01, peak: [2, 40, 12], edge: [0.05, 1.2, 0.35] },
      { x: 0.61, w: 0.011, peak: [4, 14, 55], edge: [0.1, 0.4, 1.8] },
      { x: 0.72, w: 0.008, peak: [35, 6, 40], edge: [1, 0.15, 1.2] },
      { x: 0.28, w: 0.007, peak: [8, 30, 45], edge: [0.2, 0.9, 1.4] },
      { x: 0.18, w: 0.006, peak: [50, 12, 4], edge: [1.5, 0.3, 0.1] },
    ],
    suns: [
      // Hot pin lights — sharp glints, not flood fill
      { x: 0.5, y: 0.3, r: 0.028, rgb: [140, 140, 150], gain: 1 },
      { x: 0.33, y: 0.62, r: 0.018, rgb: [90, 35, 20], gain: 1 },
      { x: 0.7, y: 0.58, r: 0.016, rgb: [25, 50, 110], gain: 1 },
      { x: 0.58, y: 0.22, r: 0.012, rgb: [100, 90, 40], gain: 1 },
    ],
  },
}

export const DEFAULT_PROCEDURAL_ENV = 'spectral'
