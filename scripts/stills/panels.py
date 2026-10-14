# Draw every story panel with the site's own renderer (home page, low-stim, EN + BG) → raw PNGs
#   npm run build && npm run serve      (in another terminal)
#   python3 scripts/stills/panels.py [view,view,...]   → scripts/stills/raw/<view>-<en|bg>.png
#   python3 scripts/stills/encode_panels.py            → src/assets/img/panels/*.webp + src/config/panels.js
# Needs Python Playwright (pip install playwright) and a Chromium with WebGL (software GL is fine).
import asyncio, sys, base64, os
from playwright.async_api import async_playwright
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw', '')
B=os.environ.get('SITE', 'http://localhost:4321')
VIEWS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['hall','bus','sofa','tickets','desk','bed','lineEve','r1','r2','r3','r4','r5','r6','r7','end','jar','ad','build','racks','jarWide']
W, H = 1280, 800
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        for loc in ['en','bg']:
            ctx = await b.new_context(viewport={'width':1440,'height':900}, device_scale_factor=2)
            await ctx.add_init_script("try{localStorage.setItem('es:opening','played');localStorage.setItem('es:calm','on')}catch(e){}")
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(B+('/bg/' if loc=='bg' else '/'), wait_until='load'); await asyncio.sleep(2)
            await pg.evaluate("document.fonts.ready")
            for v in VIEWS:
                data = await pg.evaluate("""([v,w,h])=>{var c=document.getElementById('pc'); if(!c){c=document.createElement('canvas');c.id='pc';document.body.appendChild(c);} c.style.cssText='position:fixed;left:0;top:0;width:'+w+'px;height:'+h+'px;z-index:2147483647'; var ok=window.ES&&ES.storyShoot&&ES.storyShoot(v,c); return ok? c.toDataURL('image/png') : null}""", [v, W, H])
                if not data: print('FAILED', loc, v); continue
                open(OUT+f'{v}-{loc}.png','wb').write(base64.b64decode(data.split(',')[1]))
                print(loc, v, flush=True)
            print(loc, 'errors', errs[:3])
            await ctx.close()
        await b.close()
asyncio.run(main())
