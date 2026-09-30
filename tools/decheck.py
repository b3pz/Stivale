"""Toglie la scacchiera finta (lo 'sfondo trasparente' disegnato) da una tavola RGB e salva un PNG con trasparenza vera.
uso: python3 decheck.py entrata.png uscita.png [--largo]  (--largo toglie anche i buchi piccoli, es. tra le corna)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def decheck(src, dst, vmin=150, smax=22, loose=False):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    mx, mn = a.max(2), a.min(2)
    bgl = (mx - mn <= smax) & (mn >= vmin)                    # light and grey: may be the checkerboard
    lab, n = ndimage.label(bgl)
    H, W = bgl.shape
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # enclosed pieces of checkerboard (between legs, inside cages): big and two-toned
    val = a.mean(2)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if i in edge or sl is None: continue
        m = lab[sl] == i
        if m.sum() < (60 if loose else 250): continue
        v = val[sl][m]
        if loose and v.std() > 12 and v.mean() > 215: bg[sl] |= m
        elif v.std() > 9 and (v > 235).mean() > 0.2 and (v < 225).mean() > 0.2: bg[sl] |= m
    # grow one pixel into the soft grey fringe
    fringe = ndimage.binary_dilation(bg, iterations=2) & (mx - mn <= 30) & (mn >= 120)
    bg |= fringe
    out = np.dstack([a.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    Image.fromarray(out, 'RGBA').save(dst)
    print(dst, 'trasparente:', round(bg.mean(), 3))

if __name__ == '__main__':
    decheck(sys.argv[1], sys.argv[2], loose='--largo' in sys.argv)
