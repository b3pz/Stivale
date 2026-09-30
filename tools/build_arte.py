"""STIVALE — taglia le tavole disegnate e crea l'atlante 'arte' (js/arte.js).
remo.png 4x4: 0-1 guardia · 2-7 corsa · 8 salto · 9 spara avanti · 10 spara in alto · 11 accovacciato
              che spara · 12 lancia la bomba · 13 colpito · 14 a terra · 15 esulta
invasore.png 2x4: 0-2 cammina · 3 spara · 4 spara in alto · 5 colpito · 6 a terra · 7 scappa
boss_gladiatore.png 2x4: 0 fermo · 1 passo · 2 carica · 3 tridente · 4 lancia lo scudo · 5 colpito · 6 semidistrutto · 7 crolla
bg_roma.png -> assets/bg/roma.jpg"""
import json, os
from PIL import Image
from titan_cut import cut_grid
from build_hd import scaled
from pack import pack
from segment import ROOT

frames = []
g = cut_grid('remo.png', 4, 4, merge=25, wmin=200, wmax=420)
k = 150 / g[(0, 0)]['bh']
for (r, c), f in sorted(g.items()): frames.append((f'remo_{r * 4 + c}', *scaled(f, k)))
g = cut_grid('invasore.png', 2, 4, merge=25, wmin=300, wmax=560)
k = 150 / g[(0, 0)]['bh']
for (r, c), f in sorted(g.items()): frames.append((f'inv_{r * 4 + c}', *scaled(f, k)))
# the Gladiatore d'Acciaio (drawn facing left: mirrored, every sprite faces right)
from PIL import ImageOps
g = cut_grid('boss_gladiatore.png', 2, 4, merge=30, wmin=300, wmax=560)
k = 330 / g[(0, 0)]['bh']
for (r, c), f in sorted(g.items()):
    im, ax, ay = scaled(f, k); im = ImageOps.mirror(im); frames.append((f'glad_{r * 4 + c}', im, im.width - ax, ay))
atlas, meta = pack(frames)
atlas.convert('RGBA').save(os.path.join(ROOT, 'assets', 'sprites', 'arte.png'), optimize=True)
open(os.path.join(ROOT, 'js', 'arte.js'), 'w').write('// generato da tools/build_arte.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.arte = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('arte', atlas.size, len(meta), {k: [round(v) for v in meta[k][2:4]] for k in ('remo_0', 'remo_8', 'remo_14', 'inv_0', 'inv_6')})
bg = Image.open(os.path.join(ROOT, 'assets', 'source', 'bg_roma.png')).convert('RGB')
bg = bg.resize((round(bg.width * 720 / bg.height), 720), Image.LANCZOS)
bg.save(os.path.join(ROOT, 'assets', 'bg', 'roma.jpg'), quality=88); print('roma', bg.size)
