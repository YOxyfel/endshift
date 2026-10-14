# Encodes scripts/stills/raw/*.png (from panels.py) into the panel posters the site uses, and
# writes src/config/panels.js. A view gets a Bulgarian version only if its words differ.
import os, json
from PIL import Image, ImageChops, ImageStat
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'assets', 'img', 'panels')
os.makedirs(OUT, exist_ok=True)
views = sorted({f.rsplit('-', 1)[0] for f in os.listdir(RAW) if f.endswith('-en.png')}, key=lambda v: v)
bg = []
for v in views:
    a = Image.open(os.path.join(RAW, f'{v}-en.png')).convert('RGB')
    bpath = os.path.join(RAW, f'{v}-bg.png')
    b = Image.open(bpath).convert('RGB') if os.path.exists(bpath) else a
    differs = sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3 > 0.01
    if differs: bg.append(v)
    for suffix, im in [('', a)] + ([('-bg', b)] if differs else []):
        for w in (1280, 640):
            im.resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(os.path.join(OUT, f'{v}{suffix}-{w}.webp'), 'WEBP', quality=78, method=6)
js = """// Drawn posters for the story panels: each view drawn once with the site's own renderer
// (scripts/stills/panels.py), shown while the live drawing loads, and instead of it where 3D
// can't run or the device is saving power. Views with words on things have a Bulgarian version.
export default {
  w: [640, 1280],
  ratio: 0.625,
  views: %s,
  bg: %s,
};
""" % (json.dumps(views), json.dumps(bg))
open(os.path.join(ROOT, 'src', 'config', 'panels.js'), 'w').write(js)
print(len(views), 'views,', len(bg), 'with a Bulgarian version')
