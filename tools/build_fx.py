"""STIVALE — oggetti, colpi, effetti e interfaccia disegnati -> atlante 'fx' (assets/sprites/fx.png, js/fx.js).
oggetti.png 2x4      -> obj_0-7: cassa H, S, F, R, cassa granate, granata, cassa, barile
colpi_eroi.png 2x4   -> he_0-7: pistola, mitragliatrice, rosa, fiamma, razzo, palla Vespona, lampo, scintilla (verso destra)
colpi_nemici.png 4x4 -> en_0-15: raggio, sfera, scintilla, urlo, bombetta, scudo, ingranaggio, neve, palla gigante,
                        siluro, goccia, cristallo, palla di cannone, pozza, onda di terra, ombra-bersaglio
effetti.png 2x4      -> ef_0-7: esplosione 1-4, fumo, anello, raggio, cono di luce
interfaccia.png 2x4  -> ui_0-7: cornice punti, cornice barra, cartello, testa di lupo, bomba, cartiglio, stella, cuore
ritratti.png 2x4    -> rit_0-7: Remo, Nina, Bruno, Alba, Gufo, soldato, ufficiale, Comandante (verso destra)
(teste.png 1x3, logo.png, stemma.png, scena_*.png: facoltativi, vedi sotto)"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from pack import pack
from segment import ROOT

SHEETS = [('teste', 'testa', 1, 3), ('remo_vespa', 'rv', 3, 4), ('cibo', 'cibo', 2, 4), ('nemici_citta', 'nc', 2, 4), ('veicoli', 've', 2, 4), ('miniboss', 'mb', 2, 4), ('onomatopee', 'ono', 2, 4), ('trofei', 'tro', 3, 4), ('oggetti', 'obj', 2, 4), ('colpi_eroi', 'he', 2, 4), ('colpi_nemici', 'en', 4, 4), ('effetti', 'ef', 2, 4), ('interfaccia', 'ui', 2, 4), ('ritratti', 'rit', 2, 4)]
BOTTOM = {'obj', 'cibo', 'nc', 've', 'mb', 'rv', 'en_13', 'en_14', 'en_15', 'ef_4'}   # these stand on the ground: anchor at the bottom
K = 0.5
MASKS = {}
frames = []
for fn, key, rows, cols in SHEETS:
    if not os.path.exists(os.path.join(ROOT, 'assets', 'source', fn + '.png')): continue
    k = {'rit': 0.6, 'testa': 0.14, 'tro': 0.25, 'cibo': 0.28, 'ono': 0.35, 'nc': 0.4, 've': 0.45, 'mb': 0.5, 'rv': 0.42}.get(key, K)
    im = Image.open(os.path.join(ROOT, 'assets', 'source', fn + '.png')).convert('RGBA')
    a = np.array(im)[..., 3] > 20
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    H, W = a.shape; ch, cw = H / rows, W / cols
    boxes = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl; cy, cx = (ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2
        if (ys.stop - ys.start) * (xs.stop - xs.start) < 60: continue
        cell = (min(rows - 1, int(cy // ch)), min(cols - 1, int(cx // cw)))
        b = boxes.get(cell)
        boxes[cell] = (min(b[0], ys.start), min(b[1], xs.start), max(b[2], ys.stop), max(b[3], xs.stop)) if b else (ys.start, xs.start, ys.stop, xs.stop)
    if key in ('rit', 'tro'):   # portraits touch each other: plain grid cells, each cropped to what it holds
        boxes = {}
        for r in range(rows):
            for c in range(cols):
                cy0, cy1, cx0, cx1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
                sub = a[cy0:cy1, cx0:cx1].copy()
                lab2, n2 = ndimage.label(sub)
                if not n2: continue
                sizes = ndimage.sum(sub, lab2, range(1, n2 + 1)); big = int(np.argmax(sizes)) + 1
                keep = lab2 == big
                bys, bxs = np.nonzero(keep); bx0, bx1 = bxs.min(), bxs.max()
                for i in range(1, n2 + 1):   # a neighbour's sliver touches the cell's side edges: drop it
                    if i == big or sizes[i - 1] < 30: continue
                    comp = lab2 == i; cys, cxs = np.nonzero(comp)
                    edge = cxs.min() <= 1 or cxs.max() >= sub.shape[1] - 2 or cys.min() <= 1 or cys.max() >= sub.shape[0] - 2
                    if not edge and cxs.max() >= bx0 - 20 and cxs.min() <= bx1 + 20: keep |= comp
                MASKS[(key, r, c)] = keep
                ys, xs = keep.any(1).nonzero()[0], keep.any(0).nonzero()[0]
                boxes[(r, c)] = (cy0 + ys[0], cx0 + xs[0], cy0 + ys[-1] + 1, cx0 + xs[-1] + 1)
    for (r, c), (y0, x0, y1, x1) in sorted(boxes.items()):
        name = f'{key}_{r * cols + c}'
        p = im.crop((x0, y0, x1, y1))
        if (key, r, c) in MASKS:
            cy0, cx0 = int(r * ch), int(c * cw); m = MASKS[(key, r, c)][y0 - cy0:y1 - cy0, x0 - cx0:x1 - cx0]
            arr = np.array(p); arr[~m] = 0; p = Image.fromarray(arr)
        p = p.resize((max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))), Image.LANCZOS)
        bottom = key in BOTTOM or name in BOTTOM
        frames.append((name, p, p.width / 2, p.height if bottom else p.height / 2))
    print(fn, len(boxes))
atlas, meta = pack(frames)
atlas.save(os.path.join(ROOT, 'assets', 'sprites', 'fx.png'), optimize=True)
open(os.path.join(ROOT, 'js', 'fx.js'), 'w').write('// generato da tools/build_fx.py\nwindow.ATLAS = window.ATLAS || {}; window.ATLAS.fx = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('fx', atlas.size, {k: v[2:4] for k, v in sorted(meta.items())})
