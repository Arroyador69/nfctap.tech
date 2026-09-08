"""G oficial de Google (icono 2015 / Sign in with Google).

Un solo path, viewBox 0 0 18 18. En acento de un color es la misma letra
que todo el mundo reconoce; la web usa el mismo `d`.
"""

from __future__ import annotations

import math
import re

# Google Identity / botón «Sign in with Google». No reescribir a ojo.
GOOGLE_G_D = (
    "M9.001 10.71V7.362h8.424c.126.567.225 1.098.225 1.845 "
    "0 5.139-3.447 8.793-8.64 8.793-4.968 0-9-4.032-9-9s4.032-9 9-9"
    "c2.43 0 4.464.891 6.021 2.349l-2.556 2.484c-.648-.612-1.782-1.332-3.465-1.332"
    "-2.979 0-5.409 2.475-5.409 5.508s2.43 5.508 5.409 5.508"
    "c3.447 0 4.716-2.385 4.95-3.798H9.001v-.009z"
)
GOOGLE_G_BOX = 18.0
GOOGLE_G_CX = 9.0
GOOGLE_G_CY = 9.0

_TOKEN = re.compile(
    r"([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)"
)


def _cubic(p0, p1, p2, p3, steps: int) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1.0 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def svg_path_points(d: str, steps: int = 10) -> list[tuple[float, float]]:
    tokens = _TOKEN.findall(d)
    i = 0
    x = y = 0.0
    sx = sy = 0.0
    prev_cmd = ""
    prev_ctrl: tuple[float, float] | None = None
    pts: list[tuple[float, float]] = []

    def take(n: int) -> list[float]:
        nonlocal i
        out: list[float] = []
        while len(out) < n and i < len(tokens):
            if tokens[i][1]:
                out.append(float(tokens[i][1]))
                i += 1
            else:
                break
        return out

    while i < len(tokens):
        kind, num = tokens[i]
        if kind:
            cmd = kind
            i += 1
        elif prev_cmd:
            cmd = prev_cmd
        else:
            i += 1
            continue

        rel = cmd.islower()
        c = cmd.lower()
        if c == "m":
            a = take(2)
            if len(a) < 2:
                break
            x = x + a[0] if rel else a[0]
            y = y + a[1] if rel else a[1]
            sx, sy = x, y
            pts.append((x, y))
            prev_cmd = "l" if cmd == "m" else "L"
            prev_ctrl = None
            while True:
                a = take(2)
                if len(a) < 2:
                    break
                x = x + a[0] if rel else a[0]
                y = y + a[1] if rel else a[1]
                pts.append((x, y))
            continue
        if c == "z":
            if pts and (abs(pts[-1][0] - sx) > 1e-6 or abs(pts[-1][1] - sy) > 1e-6):
                pts.append((sx, sy))
            x, y = sx, sy
            prev_cmd = ""
            prev_ctrl = None
            continue
        if c == "l":
            while True:
                a = take(2)
                if len(a) < 2:
                    break
                x = x + a[0] if rel else a[0]
                y = y + a[1] if rel else a[1]
                pts.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "h":
            while True:
                a = take(1)
                if len(a) < 1:
                    break
                x = x + a[0] if rel else a[0]
                pts.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "v":
            while True:
                a = take(1)
                if len(a) < 1:
                    break
                y = y + a[0] if rel else a[0]
                pts.append((x, y))
                prev_ctrl = None
            prev_cmd = cmd
            continue
        if c == "c":
            while True:
                a = take(6)
                if len(a) < 6:
                    break
                if rel:
                    p1 = (x + a[0], y + a[1])
                    p2 = (x + a[2], y + a[3])
                    p3 = (x + a[4], y + a[5])
                else:
                    p1 = (a[0], a[1])
                    p2 = (a[2], a[3])
                    p3 = (a[4], a[5])
                pts.extend(_cubic((x, y), p1, p2, p3, steps))
                prev_ctrl = p2
                x, y = p3
            prev_cmd = cmd
            continue
        if c == "s":
            while True:
                a = take(4)
                if len(a) < 4:
                    break
                if prev_cmd.lower() in "cs" and prev_ctrl is not None:
                    p1 = (2 * x - prev_ctrl[0], 2 * y - prev_ctrl[1])
                else:
                    p1 = (x, y)
                if rel:
                    p2 = (x + a[0], y + a[1])
                    p3 = (x + a[2], y + a[3])
                else:
                    p2 = (a[0], a[1])
                    p3 = (a[2], a[3])
                pts.extend(_cubic((x, y), p1, p2, p3, steps))
                prev_ctrl = p2
                x, y = p3
                prev_cmd = cmd
            continue
        i += 1
        prev_cmd = cmd

    if len(pts) >= 2 and abs(pts[0][0] - pts[-1][0]) < 1e-4 and abs(pts[0][1] - pts[-1][1]) < 1e-4:
        pts = pts[:-1]
    return pts


def google_g_poly(cx: float, cy: float, size: float, *, flip_y: bool = True) -> list[tuple[float, float]]:
    """Contorno de la G. `size` = diámetro. `flip_y` True para coordenadas 3D (Y arriba)."""
    raw = svg_path_points(GOOGLE_G_D)
    s = size / GOOGLE_G_BOX
    out: list[tuple[float, float]] = []
    for x, y in raw:
        px = cx + (x - GOOGLE_G_CX) * s
        py = cy - (y - GOOGLE_G_CY) * s if flip_y else cy + (y - GOOGLE_G_CY) * s
        out.append((px, py))
    return out


def google_g_svg(cx: float, cy: float, r_out: float, color: str) -> str:
    size = r_out * 2.0
    s = size / GOOGLE_G_BOX
    ox = cx - GOOGLE_G_CX * s
    oy = cy - GOOGLE_G_CY * s
    return (
        f'<g transform="translate({ox:.3f} {oy:.3f}) scale({s:.5f})">'
        f'<path d="{GOOGLE_G_D}" fill="{color}"/></g>'
    )


def google_g_pil(draw, cx: float, cy: float, r_out: float, color: tuple[int, int, int], cut=None) -> None:
    del cut
    poly = google_g_poly(cx, cy, r_out * 2.0, flip_y=False)
    if len(poly) >= 3:
        draw.polygon(poly, fill=color)
