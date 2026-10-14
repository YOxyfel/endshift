// Drawn posters for the story panels: each view drawn once with the site's own renderer
// (scripts/stills/panels.py), shown while the live drawing loads, and instead of it where 3D
// can't run or the device is saving power. Views with words on things have a Bulgarian version.
export default {
  w: [640, 1280],
  ratio: 0.625,
  views: ["ad", "bed", "build", "bus", "desk", "end", "hall", "jar", "jarWide", "lineEve", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "racks", "sofa", "tickets"],
  bg: ["ad", "bed", "build", "desk", "hall", "r1", "sofa", "tickets"],
};
