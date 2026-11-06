// ─────────────────────────────────────────────────────────────
// CITY: tweak the generated street map here, no game logic lives in this file.
// Sizes are in tiles unless they say otherwise. One tile is 64 px in the world.
// ─────────────────────────────────────────────────────────────

export const CITY = {
  /** Size of one tile in the world. MAP.size must be a multiple of this. */
  tileSize: 64,
  /** Size of one tile in the art sheets. Sheets are drawn at tileSize / artTileSize, like the player and drones. */
  artTileSize: 32,

  /** Road width, kerb to kerb. Sidewalks come on top of this (see `sidewalk`). */
  avenueWidth: 7,
  streetWidth: 5,
  /** Alleys cut through a building, so this is the whole gap between its two halves. */
  alleyWidth: 2,
  /** Sidewalk around every block. */
  sidewalk: 1,

  /** Distance between avenues, picked at random for every gap. */
  avenueSpacing: { min: 22, max: 34 },
  /** A block longer than `maxBlock` on one side gets cut by a side street. No cut leaves a block shorter than `minBlock`. */
  maxBlock: 18,
  minBlock: 9,

  /** Open plazas per map, besides the one at the start. They are reserved, not rolled, so a map never runs short. */
  plazas: 8,
  /** Blocks smaller than this on either side can't be a plaza. */
  plazaMinSize: 9,
  /** No two plazas closer than this, centre to centre. */
  plazaSpacing: 20,

  /** Alleys per map, picked at random. They are placed, not rolled, so every map has a few. */
  alleys: { min: 4, max: 7 },
  /** A block needs a building at least this long to get an alley. */
  alleyMinBuilding: 12,
  /** Each half of a building cut by an alley is at least this long. */
  alleyMinPiece: 5,

  /** How many tiles tall a building's south front is. The rest of the building is roof. */
  frontRows: 3,
  /** Chance that a roof centre tile holds a detail (vent, AC unit...). */
  roofDetailChance: 0.05,
  /** Chance that a street-level front tile is a variant (door, shopfront, sign...). */
  frontVariantChance: 0.25,
}

/** Where each piece sits in the sheet, as a tile index: row * 8 + column. Sheets are 8 tiles wide and 4 tall. */
export const GROUND_TILES = {
  road: 0,
  laneH: 1,
  laneV: 2,
  crosswalkH: 3,
  crosswalkV: 4,
  alley: 5,
  plaza: 6,
  /** The 3x3 sidewalk, top left to bottom right. The centre is not used by the 1-tile sidewalk, but wider ones will. */
  sidewalk: [8, 9, 10, 16, 17, 18, 24, 25, 26],
}

export const BUILDING_TILES = {
  /** The 3x3 roof, top left to bottom right. The centre has to tile seamlessly. */
  roof: [0, 1, 2, 8, 9, 10, 16, 17, 18],
  roofDetails: [3, 4, 5, 6],
  /** The 3x3 front: top row, window row (repeats on taller fronts), street level; each left end, middle, right end. */
  front: [11, 12, 13, 19, 20, 21, 27, 28, 29],
  /** Swapped in for street-level middle tiles. */
  frontVariants: [14, 15, 22, 23, 30],
}
