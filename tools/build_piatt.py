"""STIVALE — le piattaforme disegnate di ogni città: assets/source/piatt_<citta>.png (1x4, sfondo trasparente)
1) piattaforma lunga · 2) piattaforma corta · 3) sostegno alto · 4) oggetto di scena
-> atlante 'piatt' (assets/sprites/piatt.png, js/piatt.js), chiavi <citta>_lunga, _corta, _palo, _deco.
Ancore: piattaforme = angolo in alto a sinistra del piano su cui si cammina; palo e oggetto = in basso al centro."""
import glob, json, os
import numpy as np
from PIL import Image
from pack import pack
from segment import ROOT

def pieces(im):
    a = np.array(im)[..., 3] > 20
    cols = a.sum(0) > 0
    runs, s = [], None
    for x, v in enumerate(list(cols) + [False]):
        if v and s is None: s = x
        if not v and s is not None: runs.append([s, x]); s = None
    # merge crumbs into the nearest big piece until there are 4
    runs = [r for r in runs if r[1] - r[0] > 4]
    while len(runs) > 4:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = int(np.argmin(gaps)); runs[i:i + 2] = [[runs[i][0], runs[i + 1][1]]]
    out = []
    for x0, x1 in runs:
        sub = a[:, x0:x1]; ys = np.where(sub.any(1))[0]
        out.append(im.crop((x0, ys[0], x1, ys[-1] + 1)))
    return out

def top_row(p):
    a = np.array(p)[..., 3] > 20
    frac = a.mean(1)
    return int(np.argmax(frac > 0.75))   # the first row that is (almost) all stone: the floor you walk on

frames = []
for fn in sorted(glob.glob(os.path.join(ROOT, 'assets', 'source', 'piatt_*.png'))):
    city = os.path.basename(fn)[6:-4]
    im = Image.open(fn).convert('RGBA')
    ps = pieces(im)
    assert len(ps) == 4, (city, len(ps))
    k = 520 / ps[0].width   # the long slab becomes 520 px wide; everything else keeps its proportion
    for name, p in zip(['lunga', 'corta', 'palo', 'deco'], ps):
        top = top_row(p) if name in ('lunga', 'corta') else 0
        q = p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)
        if name in ('lunga', 'corta'): ax, ay = 0, top * k
        else: ax, ay = q.width / 2, q.height
        frames.append((f'{city}_{name}', q, ax, ay))
    print(city, [p.size for p in ps])
atlas, meta = pack(frames)
atlas.save(os.path.join(ROOT, 'assets', 'sprites', 'piatt.png'), optimize=True)
open(os.path.join(ROOT, 'js', 'piatt.js'), 'w').write('// generato da tools/build_piatt.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.piatt = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('piatt', atlas.size, json.dumps(meta))
