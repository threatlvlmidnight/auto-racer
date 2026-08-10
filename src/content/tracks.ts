import type { Track } from "../simulation/tracks";

// Authored fixed track catalog (013-race-spectacle, data-model.md "Track").
// Every point below is hand-authored, static data — never generated,
// splined, or randomized at runtime (research.md Decision 1). This is the
// only thing that removes cross-client drift risk for a shape that must
// look identical for every viewer of the same contest.
//
// All three shapes share one bounding box (roughly x:70-560, y:84-320) so
// ContestScene can lay out a fixed standings sidebar to the right without
// per-track layout logic.

export const TRACKS: readonly Track[] = [
  {
    id: "track-harborline",
    name: "The Harborline",
    points: [
      { x: 530, y: 210 }, { x: 519, y: 239 }, { x: 486, y: 268 }, { x: 435, y: 294 },
      { x: 371, y: 313 }, { x: 300, y: 320 }, { x: 229, y: 313 }, { x: 165, y: 294 },
      { x: 114, y: 268 }, { x: 81, y: 239 }, { x: 70, y: 210 }, { x: 81, y: 181 },
      { x: 114, y: 152 }, { x: 165, y: 126 }, { x: 229, y: 107 }, { x: 300, y: 100 },
      { x: 371, y: 107 }, { x: 435, y: 126 }, { x: 486, y: 152 }, { x: 519, y: 181 },
    ],
  },
  {
    id: "track-switchback",
    name: "Switchback Rise",
    points: [
      { x: 520, y: 210 }, { x: 530, y: 245 }, { x: 507, y: 280 }, { x: 453, y: 303 },
      { x: 388, y: 311 }, { x: 328, y: 311 }, { x: 272, y: 311 }, { x: 212, y: 311 },
      { x: 147, y: 303 }, { x: 93, y: 280 }, { x: 70, y: 245 }, { x: 80, y: 210 },
      { x: 108, y: 181 }, { x: 137, y: 155 }, { x: 165, y: 129 }, { x: 206, y: 102 },
      { x: 265, y: 84 }, { x: 335, y: 84 }, { x: 394, y: 102 }, { x: 435, y: 129 },
      { x: 463, y: 155 }, { x: 492, y: 181 },
    ],
  },
  {
    id: "track-millpond",
    name: "Millpond Loop",
    points: [
      { x: 558, y: 210 }, { x: 543, y: 260 }, { x: 500, y: 296 }, { x: 438, y: 313 },
      { x: 367, y: 316 }, { x: 300, y: 310 }, { x: 244, y: 298 }, { x: 203, y: 283 },
      { x: 177, y: 263 }, { x: 163, y: 238 }, { x: 159, y: 210 }, { x: 163, y: 182 },
      { x: 177, y: 157 }, { x: 203, y: 137 }, { x: 244, y: 122 }, { x: 300, y: 110 },
      { x: 367, y: 104 }, { x: 438, y: 107 }, { x: 500, y: 124 }, { x: 543, y: 160 },
    ],
  },
];
