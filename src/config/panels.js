// Drawn posters for the story panels: each view drawn once with the site's own renderer
// (scripts/stills/panels.md), shown while the live drawing loads, and instead of it where 3D
// can't run or the device is saving power. Views with words on things have a Bulgarian version.
export default {
  w: [640, 1280],
  ratio: 0.625,
  views: ["hall", "bus", "sofa", "tickets", "desk", "bed", "lineEve", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "end", "jar", "ad", "build", "racks", "jarWide"],
  bg: ["hall", "sofa", "tickets", "desk", "bed", "lineEve", "r1", "ad", "build"],
};
