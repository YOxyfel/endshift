# The RESET pictures

`assets/img/photos/reset-jar-studio-*` and `reset-jar-night-*` are drawings made with the site's own
ink renderer (the same jar as the film, the ritual and the turntable), by `stills.js` in this folder.

To draw them again (after the jar changes, say):

1. `npm run build`, then make `dist/_stills/` with this `stills.js`, the two brand fonts as `sec.ttf`
   (Sofia Sans Extra Condensed) and `ss.ttf` (Sofia Sans), and an `index.html` that declares the two
   fonts with `@font-face`, has `<canvas id="c">`, and loads `/assets/js/ink.<hash>.js`,
   `/assets/js/room.<hash>.js` and then `stills.js` (all as separate files: the site's CSP blocks inline scripts).
2. Serve `dist` and open `/_stills/?` + one of the query strings below. When `window.__done` is true,
   `window.__png` holds the picture (rendered at `ss`× the size); scale it down to `w`×`h`.
3. Add a soft vignette (12% at the corners for the studio, 16% for the night) and save each size the
   page uses: studio 1136 and 640 wide, night 1536 and 800 wide, as JPEG (quality 86) and WebP (84).
4. `dist/_stills/` goes away with the next build.

Studio (v0.21):

```
shot=studio&w=1136&h=1408&ss=2&at=40,21,82&to=-1.8,7.8,-1.5&bry=-8&bx=-9.6&bz=-9.5&fov=18.5&amb=%23484442&fill=0.22&fillc=%23dfe6f2&key=1.6&keyc=%23ffe9cc&keyp=-80,52,84&keyr=440&top=0.25&halo=0.6&castl=30&cast=0.34&paper=%23dccab0
```

Night (v0.21):

```
shot=night&w=1536&h=1024&ss=2&hatch=0.35&lx=19&lz=-22&gp=6,52.5,-10&at=8,66,52&to=1.5,64.5,-4&fov=44&face=-26&room=0.6
```

# The panel posters

Every story panel (the comic frames on the home page, RESET, Batch #001 and Story, the ritual's
room loop, the opening and the journal covers) has a drawn poster in `src/assets/img/panels/`:
the same view, drawn once by the site's own renderer. It shows while the live drawing loads, and
instead of it where 3D can't run or the device is saving data.

To draw them again (after changing a room): `npm run build`, `npm run serve`, then
`python3 scripts/stills/panels.py` and `python3 scripts/stills/encode_panels.py`. Views whose
words differ between English and Bulgarian get a `-bg` version automatically.

# The share cards

`npm run og` (after a build) draws one 1200×630 card per page and language into
`src/assets/img/og/` from these posters and the page's own title. Build again to link them.
