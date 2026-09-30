"""MAMMA MIA — sprite dei livelli speciali -> atlante 'sp' (assets/sprites/sp.png, js/sp.js).
Tutti facoltativi: se un foglio manca il gioco usa il disegno provvisorio.
volo.png 3x4       -> vo_0-11: Vespa volante da dietro (dritta, piega a sinistra, piega a destra, colpita),
                      Remo, Nina, Bruno, Alba visti da dietro seduti, scoglio, faraglione, anello d'oro, nave madre
mare.png 2x4       -> pe_0-7: pesce di latta (nuota 1, nuota 2, colpito), mina, gabbia chiusa, gabbia aperta, disco-sommergibile, alga
boss_mare.png 2x4  -> sm_0-7: sottomarino abissale (fermo 1, fermo 2, siluri, mine, carica, colpito, arrabbiato, distrutto) verso sinistra
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from pack import pack
from segment import ROOT

# volo.png came out with the four planes in a 2x2 block on top: cells given as rectangles (fractions x0, y0, x1, y1)
RECTS = {'vo': [(0, 0, .5, .22), (.5, 0, 1, .22), (0, .22, .5, .44), (.5, .22, 1, .44)] +
               [(i / 4, .44, (i + 1) / 4, .70) for i in range(4)] + [(i / 4, .70, (i + 1) / 4, 1) for i in range(4)]}
SHEETS = [('catena_gigante', 'cg', 2, 2, 2.8), ('volo', 'vo', 3, 4, 0.6), ('mare', 'pe', 2, 4, 0.4), ('boss_mare', 'sm', 2, 4, 0.8)]
frames = []
for fn, key, rows, cols, k in SHEETS:
    path = os.path.join(ROOT, 'assets', 'source', fn + '.png')
    if not os.path.exists(path): continue
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[..., 3] > 20
    H, W = a.shape; ch, cw = H / rows, W / cols
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=6))
    boxes = {}
    for sl in ndimage.find_objects(lab):
        ys, xs = sl
        if (ys.stop - ys.start) * (xs.stop - xs.start) < 200: continue
        cy, cx = (ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2
        cell = (min(rows - 1, int(cy // ch)), min(cols - 1, int(cx // cw)))
        if key in RECTS:
            fy, fx = cy / H, cx / W
            idx = next((i for i, (x0, y0, x1, y1) in enumerate(RECTS[key]) if x0 <= fx < x1 and y0 <= fy < y1), None)
            if idx is None: continue
            cell = (idx // cols, idx % cols)
        b = boxes.get(cell)
        boxes[cell] = (min(b[0], ys.start), min(b[1], xs.start), max(b[2], ys.stop), max(b[3], xs.stop)) if b else (ys.start, xs.start, ys.stop, xs.stop)
    for (r, c), (y0, x0, y1, x1) in sorted(boxes.items()):
        name = f'{key}_{r * cols + c}'
        p = im.crop((x0, y0, x1, y1))
        p = p.resize((max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))), Image.LANCZOS)
        frames.append((name, p, p.width / 2, p.height / 2))
    print(fn, len(boxes))
out_js = os.path.join(ROOT, 'js', 'sp.js')
if frames:
    atlas, meta = pack(frames)
    atlas.save(os.path.join(ROOT, 'assets', 'sprites', 'sp.png'), optimize=True)
    print('sp', atlas.size)
else:
    meta = {}
open(out_js, 'w').write('// generato da tools/build_sp.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.sp = ' + json.dumps(meta, separators=(',', ':')) + ';\n')

# the sea under the plane: a texture seen from above, made to repeat both ways -> assets/bg/mare_volo.jpg
src = os.path.join(ROOT, 'assets', 'source', 'mare_volo.png')
if os.path.exists(src):
    A = np.asarray(Image.open(src).convert('RGB').resize((768, 768), Image.LANCZOS)).astype(float)
    for axis in (0, 1):
        o = A.shape[axis] // 8
        k = np.linspace(0, 1, o).reshape((-1, 1, 1) if axis == 0 else (1, -1, 1))
        head = np.take(A, range(A.shape[axis] - o, A.shape[axis]), axis) * (1 - k) + np.take(A, range(o), axis) * k
        A = np.concatenate([head, np.take(A, range(o, A.shape[axis] - o), axis)], axis)
    Image.fromarray(A.astype('uint8')).save(os.path.join(ROOT, 'assets', 'bg', 'mare_volo.jpg'), quality=86)
    print('mare_volo', A.shape)
