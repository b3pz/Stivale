"""STIVALE — taglia le tavole disegnate e crea l'atlante 'arte' (js/arte.js).
remo.png 4x4: 0-1 guardia · 2-7 corsa · 8 salto · 9 spara avanti · 10 spara in alto · 11 accovacciato
              che spara · 12 lancia la bomba · 13 colpito · 14 a terra · 15 esulta
invasore.png 2x4: 0-2 cammina · 3 spara · 4 spara in alto · 5 colpito · 6 a terra · 7 scappa
boss_gladiatore.png 2x4: 0 fermo · 1 passo · 2 carica · 3 tridente · 4 lancia lo scudo · 5 colpito · 6 semidistrutto · 7 crolla
bg_<citta>.png -> assets/bg/<citta>.jpg"""
import json, os
from PIL import Image
from titan_cut import cut_grid, cut_whole
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
def sheet(name, rows, cols, key, h, flip=False, ref=(0, 0), whole=False, **kw):
    g = (cut_whole if whole else cut_grid)(name, rows, cols, merge=kw.pop('merge', 25), **kw)
    k = h / g[ref]['bh']
    for (r, c), f in sorted(g.items()):
        im, ax, ay = scaled(f, k)
        if flip: im = ImageOps.mirror(im); ax = im.width - ax
        frames.append((f'{key}_{r * cols + c}', im, ax, ay))
sheet('nina.png', 4, 4, 'nina', 150, whole=True, wmin=200, wmax=460)
sheet('bruno.png', 4, 4, 'bruno', 155, whole=True, wmin=200, wmax=460)
sheet('alba.png', 4, 4, 'alba', 160, whole=True, wmin=200, wmax=460)
sheet('vespona.png', 1, 6, 'vesp', 170, wmin=200, wmax=480)
sheet('gufo.png', 1, 4, 'gufo', 190, wmin=300, wmax=640)
sheet('prigionieri.png', 2, 4, 'pris', 120, wmin=200, wmax=460)
sheet('robottino.png', 1, 6, 'robo', 110, wmin=200, wmax=480)
sheet('ufficiale.png', 2, 4, 'uff', 160, whole=True, wmin=300, wmax=560)
sheet('disco.png', 1, 5, 'disco', 120, wmin=250, wmax=560)
sheet('legionario.png', 2, 4, 'leg', 185, flip=True, whole=True, wmin=300, wmax=560)
atlas, meta = pack(frames)
atlas.convert('RGBA').save(os.path.join(ROOT, 'assets', 'sprites', 'arte.png'), optimize=True)
open(os.path.join(ROOT, 'js', 'arte.js'), 'w').write('// generato da tools/build_arte.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.arte = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('arte', atlas.size, len(meta))
# the bosses of the missions (all drawn facing left): atlas 'capi'
frames = []
for key, fn, h in [('piov', 'boss_piovra', 340), ('catena', 'boss_catena', 330), ('sotto', 'boss_sottomarino', 300), ('pupazzo', 'boss_pupazzo', 340), ('miraggio', 'boss_miraggio', 300), ('comand', 'boss_comandante', 350), ('cupola', 'boss_cupola', 290)]:
    sheet(fn + '.png', 2, 4, key, h, flip=True, whole=True, wmin=300, wmax=560)
atlas, meta = pack(frames)
atlas.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(ROOT, 'assets', 'sprites', 'capi.png'), optimize=True)
open(os.path.join(ROOT, 'js', 'capi.js'), 'w').write('// generato da tools/build_arte.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.capi = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('capi', atlas.size, len(meta))
frames = []
# the city backgrounds: every assets/source/bg_<city>.png -> assets/bg/<city>.jpg, 720 px high
import glob
for fn in sorted(glob.glob(os.path.join(ROOT, 'assets', 'source', 'bg_*.png'))):
    city = os.path.basename(fn)[3:-4]
    bg = Image.open(fn).convert('RGB')
    bg = bg.resize((round(bg.width * 720 / bg.height), 720), Image.LANCZOS)
    bg.save(os.path.join(ROOT, 'assets', 'bg', city + '.jpg'), quality=88); print(city, bg.size)
