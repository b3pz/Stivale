"""Taglio a griglia per tavole 2x4 dove le figure (e i bagliori) si toccano:
tagli di riga e di colonna nei punti con meno pixel pieni, poi dentro ogni cella
si tiene il corpo più grande e i pezzi vicini."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from segment import SRC


def best_cut(proj, centre, span):
    lo, hi = max(1, centre - span), min(len(proj) - 1, centre + span)
    seg = proj[lo:hi]
    m = seg.min()
    idx = np.nonzero(seg <= m + max(2, m * 0.1))[0]
    return lo + int(idx[len(idx) // 2])     # middle of the emptiest stretch


def dp_cuts(proj, cols, wmin, wmax):
    """cols-1 cuts minimising the opaque pixels crossed, each cell between wmin and wmax wide"""
    W = len(proj); INF = float('inf')
    cost = proj.astype(float)
    best = np.full((cols + 1, W + 1), INF); prev = np.zeros((cols + 1, W + 1), int)
    best[0][0] = 0
    for k in range(1, cols + 1):
        for x in range(W + 1):
            lo, hi = max(0, x - wmax), x - wmin
            if hi < lo: continue
            seg = best[k - 1][lo:hi + 1]
            j = int(np.argmin(seg)); v = seg[j]
            if v == INF: continue
            best[k][x] = v + (cost[x] if x < W else 0); prev[k][x] = lo + j
    cuts = [W]; x = W
    for k in range(cols, 0, -1):
        x = prev[k][x]; cuts.append(x)
    return cuts[::-1]


def cut_grid(name, rows=2, cols=4, thr=110, merge=30, span=None, wmin=None, wmax=None, xcuts=None):
    rgba = np.array(Image.open(SRC + name).convert('RGBA'))
    H, W = rgba.shape[:2]
    mask = rgba[..., 3] > thr
    solid = ndi.binary_erosion(rgba[..., 3] >= 250, iterations=2)   # bodies without the soft glows
    rc = [0] + [best_cut(mask.sum(1), H * r // rows, H // 6) for r in range(1, rows)] + [H]
    out = {}
    for r in range(rows):
        band = mask[rc[r]:rc[r + 1]]
        if xcuts: cc = [0] + list(xcuts[r]) + [W]
        elif wmin:
            sb = solid[rc[r]:rc[r + 1]]
            rows_on = np.nonzero(sb.any(1))[0]; bot = rows_on.max() if len(rows_on) else sb.shape[0]
            feet = sb[max(0, bot - 70):bot + 1].sum(0)          # the feet never overlap: cutting there is expensive
            cc = dp_cuts(sb.sum(0) + feet * 25, cols, wmin, wmax)
        else: cc = [0] + [best_cut(band.sum(0), W * c // cols, span or W // 12) for c in range(1, cols)] + [W]
        for c in range(cols):
            y0, y1, x0, x1 = rc[r], rc[r + 1], cc[c], cc[c + 1]
            m = mask[y0:y1, x0:x1]
            lab, n = ndi.label(m, structure=np.ones((3, 3)))
            sizes = ndi.sum(m, lab, range(1, n + 1))
            body = int(np.argmax(sizes)) + 1
            near = ndi.binary_dilation(lab == body, iterations=merge)
            keep = np.zeros_like(m)
            for i in range(1, n + 1):
                comp = lab == i
                spill = (c > 0 and comp[:, 0].any()) or (c < cols - 1 and comp[:, -1].any())   # a neighbour's glow
                if i == body or (sizes[i - 1] >= 20 and not spill and (comp & near).any()):
                    keep |= comp
            ys, xs = np.nonzero(keep)
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = rgba[y0:y1, x0:x1][by0:by1, bx0:bx1].copy()
            k = keep[by0:by1, bx0:bx1]
            crop[~k] = 0
            crop[k, 3] = 255
            bm = (lab == body)[by0:by1, bx0:bx1]
            yy, xx = np.nonzero(bm)
            foot, top = yy.max(), yy.min()
            mid = (yy > top + (foot - top) * 0.25) & (yy < top + (foot - top) * 0.6)
            out[(r, c)] = dict(row=r, col=c, img=Image.fromarray(crop), ax=float(xx[mid].mean()), ay=float(foot + 1),
                               bh=float(foot - top))
    return out


def cut_whole(name, rows, cols, thr=110, merge=12, **kw):
    """Like cut_grid, but a figure is never sliced: every connected drawing whose centre falls in a cell
    belongs to that cell whole (weapons and scarves that stick into the neighbour cell stay attached).
    Falls back to cut_grid's crop only when a figure is glued to its neighbour."""
    base = cut_grid(name, rows, cols, thr=thr, **kw)
    rgba = np.array(Image.open(SRC + name).convert('RGBA'))
    H, W = rgba.shape[:2]
    mask = rgba[..., 3] > thr
    lab, n = ndi.label(ndi.binary_dilation(mask, iterations=2), structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    ch, cw = H / rows, W / cols
    cells = {}
    for i, sl in enumerate(objs):
        comp = (lab[sl] == i + 1) & mask[sl]
        area = comp.sum()
        if area < 150: continue
        ys, xs = np.nonzero(comp)
        cy, cx = sl[0].start + ys.mean(), sl[1].start + xs.mean()
        cell = (min(rows - 1, int(cy // ch)), min(cols - 1, int(cx // cw)))
        cells.setdefault(cell, []).append((area, i + 1, sl))
    out = {}
    for (r, c), f in base.items():
        L = sorted(cells.get((r, c), []), reverse=True)
        if not L: out[(r, c)] = f; continue
        body_area, bid, bsl = L[0]
        if (bsl[1].stop - bsl[1].start) > cw * 1.45 or (bsl[0].stop - bsl[0].start) > ch * 1.3:
            out[(r, c)] = f; continue   # glued to a neighbour: keep the old crop
        keep = np.zeros_like(mask)
        for area, lid, sl in L:
            if lid == bid or area > 60: keep[sl] |= (lab[sl] == lid) & mask[sl]
        ys, xs = np.nonzero(keep)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = rgba[y0:y1, x0:x1].copy(); k = keep[y0:y1, x0:x1]
        crop[~k] = 0; crop[k, 3] = 255
        bm = ((lab == bid) & mask)[y0:y1, x0:x1]
        yy, xx = np.nonzero(bm)
        foot, top = yy.max(), yy.min()
        mid = (yy > top + (foot - top) * 0.25) & (yy < top + (foot - top) * 0.6)
        out[(r, c)] = dict(row=r, col=c, img=Image.fromarray(crop), ax=float(xx[mid].mean()), ay=float(foot + 1), bh=float(foot - top))
    return out
