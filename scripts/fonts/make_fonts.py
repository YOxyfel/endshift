# Self-hosted Sofia Sans + Sofia Sans Extra Condensed, cut like Google Fonts serves them:
# the weight range the site uses, four subsets (latin, latin-ext, cyrillic, cyrillic-ext), WOFF2.
#   python3 scripts/fonts/make_fonts.py <folder with the google/fonts "ofl" directory>
# Needs fontTools. WOFF2 needs the "brotli" package; without it, brotli_node.py here stands in
# (it uses Node's built-in zlib).
import sys, os, io
HERE = os.path.dirname(os.path.abspath(__file__))
try:
    import brotli  # noqa: F401
except ImportError:
    import importlib.util
    spec = importlib.util.spec_from_file_location('brotli', os.path.join(HERE, 'brotli_node.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    sys.modules['brotli'] = mod
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
G = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', '')
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'fonts', '')
os.makedirs(OUT, exist_ok=True)
RANGES = {
  'cyrillic-ext': 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
  'cyrillic': 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  'latin': 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2199, U+2212, U+2215, U+FEFF, U+FFFD',
}
def codepoints(r):
    out=[]
    for part in r.split(','):
        part=part.strip()[2:]
        if '-' in part: a,b=part.split('-'); out += list(range(int(a,16), int(b,16)+1))
        else: out.append(int(part,16))
    return out
FACES = [
  ('Sofia Sans Extra Condensed', 'normal', G+'sofiasansextracondensed/SofiaSansExtraCondensed[wght].ttf', (500, 900), 'sofia-sans-extra-condensed'),
  ('Sofia Sans', 'normal', G+'sofiasans/SofiaSans[wght].ttf', (300, 750), 'sofia-sans'),
  ('Sofia Sans', 'italic', G+'sofiasans/SofiaSans-Italic[wght].ttf', (400, 600), 'sofia-sans-italic'),
]
css = "/* Sofia Sans and Sofia Sans Extra Condensed by Lettersoup. SIL Open Font License 1.1 (OFL.txt). Cut from the Google Fonts sources: the weights the site uses, four subsets, WOFF2. */\n"
total = 0
for fam, style, src, (lo, hi), stem in FACES:
    base = TTFont(src)
    lim = instancer.instantiateVariableFont(base, {'wght': (lo, hi)})
    buf = io.BytesIO(); lim.save(buf)
    for sub in ['cyrillic-ext', 'cyrillic', 'latin-ext', 'latin']:
        f = TTFont(io.BytesIO(buf.getvalue()))
        opts = subset.Options()
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.flavor = 'woff2'
        opts.drop_tables = []
        s = subset.Subsetter(options=opts)
        s.populate(unicodes=codepoints(RANGES[sub]))
        s.subset(f)
        name = f'{stem}-{sub}.woff2'
        f.flavor = 'woff2'
        f.save(OUT + name)
        size = os.path.getsize(OUT + name); total += size
        print(f'{name:48s} {size/1024:6.1f} KB')
        css += f"/* {sub} */\n@font-face {{\n  font-family: '{fam}';\n  font-style: {style};\n  font-weight: {lo} {hi};\n  font-display: swap;\n  src: url('./{name}') format('woff2');\n  unicode-range: {RANGES[sub]};\n}}\n"
open(OUT + 'fonts.css', 'w').write(css)
import shutil
shutil.copy(G + 'sofiasans/OFL.txt', OUT + 'OFL.txt')
print('total KB', total // 1024)
