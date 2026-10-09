import math
import struct
import zlib
import os

# Brand Identity: #1580D1
# Logo: Cursor click pointer with 5 radiating burst lines
# Style: soft - rounded rectangle in #1580D1

# Raw polygon vertices matching user-uploaded vector geometry (bounds: X:[63, 312], Y:[48, 297])
ARROW = [
    (220, 131), (224, 137), (176, 294), (165, 294), (143, 246),
    (92, 297), (64, 268), (111, 221), (65, 198), (63, 191)
]
RAY1 = [(127, 71), (174, 116), (164, 125), (118, 81)]
RAY2 = [(196, 48), (210, 48), (210, 114), (196, 114)]
RAY3 = [(273, 82), (284, 91), (239, 135), (230, 124)]
RAY4 = [(250, 152), (312, 152), (312, 166), (250, 166)]
RAY5 = [(242, 181), (288, 226), (279, 236), (232, 191)]
RAW_POLYS = [ARROW, RAY1, RAY2, RAY3, RAY4, RAY5]

PATHS_DEF = '''    <path d="M 220 131 L 224 137 L 176 294 L 165 294 L 143 246 L 92 297 L 64 268 L 111 221 L 65 198 L 63 191 Z" />
    <path d="M 127 71 L 174 116 L 164 125 L 118 81 Z" />
    <path d="M 196 48 L 210 48 L 210 114 L 196 114 Z" />
    <path d="M 273 82 L 284 91 L 239 135 L 230 124 Z" />
    <path d="M 250 152 L 312 152 L 312 166 L 250 166 Z" />
    <path d="M 242 181 L 288 226 L 279 236 L 232 191 Z" />'''

# 1. Generate SVG strings
ICON_SVG_32 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">
  <rect width="32" height="32" rx="6" fill="#1580D1"/>
  <g transform="translate(0.3, 1.55) scale(0.08375)" fill="#FFFFFF">
{PATHS_DEF}
  </g>
</svg>'''

ICON_SVG_512 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <rect width="512" height="512" rx="96" fill="#1580D1"/>
  <g transform="translate(5, 25) scale(1.34)" fill="#FFFFFF">
{PATHS_DEF}
  </g>
</svg>'''

def make_logo_svg(text_color):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40" width="190" height="40" fill="none">
  <!-- Brand Mark Icon (soft style) -->
  <rect x="2" y="2" width="36" height="36" rx="6" fill="#1580D1"/>
  <g transform="translate(2.33, 3.75) scale(0.0942)" fill="#FFFFFF">
{PATHS_DEF}
  </g>
  <!-- Wordmark -->
  <text x="48" y="27" font-family="'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.03em" fill="{text_color}">whysogood</text>
</svg>'''

LOGO_SVG_ADAPTIVE = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40" width="190" height="40" fill="none">
  <style>
    .wordmark {{ fill: #0A1116; }}
    @media (prefers-color-scheme: dark) {{
      .wordmark {{ fill: #F0F4F8; }}
    }}
  </style>
  <rect x="2" y="2" width="36" height="36" rx="6" fill="#1580D1"/>
  <g transform="translate(2.33, 3.75) scale(0.0942)" fill="#FFFFFF">
{PATHS_DEF}
  </g>
  <text x="48" y="27" class="wordmark" font-family="'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.03em">whysogood</text>
</svg>'''

# 2. Rasterizer for high-res icons and favicon
def make_png(width, height, rgba_data):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_data[y * width * 4 : (y + 1) * width * 4])
    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def point_in_poly(x, y, p, xmin, xmax, ymin, ymax):
    if x < xmin or x > xmax or y < ymin or y > ymax:
        return False
    inside = False
    n = len(p)
    p1x, p1y = p[0]
    for i in range(n + 1):
        p2x, p2y = p[i % n]
        if y > min(p1y, p2y) and y <= max(p1y, p2y) and x <= max(p1x, p2x):
            if p1y != p2y:
                xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
            if p1x == p2x or x <= xinters:
                inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def render_icon(size):
    ss = 4 if size <= 64 else (3 if size <= 192 else 2)
    W = size * ss
    H = size * ss
    img = bytearray(W * H * 4)

    # 96px radius per 512px icon
    rad = (size * 96.0 / 512.0) * ss
    scale = (size * 1.34 / 512.0) * ss
    dx = (size * 4.75 / 512.0) * ss
    dy = (size * 24.85 / 512.0) * ss

    scaled_polys = []
    for p in RAW_POLYS:
        sp = [(dx + x * scale, dy + y * scale) for x, y in p]
        scaled_polys.append((sp, min(x for x, y in sp), max(x for x, y in sp), min(y for x, y in sp), max(y for x, y in sp)))

    overall_xmin = min(p[1] for p in scaled_polys)
    overall_xmax = max(p[2] for p in scaled_polys)
    overall_ymin = min(p[3] for p in scaled_polys)
    overall_ymax = max(p[4] for p in scaled_polys)

    for y in range(H):
        for x in range(W):
            edx = max(rad - x, 0, x - (W - rad))
            edy = max(rad - y, 0, y - (H - rad))
            if edx*edx + edy*edy > rad*rad:
                continue
            idx = (y * W + x) * 4
            in_poly = False
            if overall_xmin <= x <= overall_xmax and overall_ymin <= y <= overall_ymax:
                for sp, xmin, xmax, ymin, ymax in scaled_polys:
                    if point_in_poly(x, y, sp, xmin, xmax, ymin, ymax):
                        in_poly = True
                        break
            if in_poly:
                # Crisp white cursor/burst
                img[idx:idx+4] = b'\xff\xff\xff\xff'
            else:
                # Brand primary: #1580D1 -> (21, 128, 209)
                img[idx:idx+4] = b'\x15\x80\xd1\xff'

    out = bytearray(size * size * 4)
    for oy in range(size):
        for ox in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    iy = oy * ss + sy
                    ix = ox * ss + sx
                    i_idx = (iy * W + ix) * 4
                    alpha = img[i_idx + 3] / 255.0
                    r += img[i_idx] * alpha
                    g += img[i_idx + 1] * alpha
                    b += img[i_idx + 2] * alpha
                    a += img[i_idx + 3]
            total_samples = ss * ss
            final_a = a / total_samples
            if final_a > 0:
                final_r = min(255, int((r / total_samples) / (final_a / 255.0)))
                final_g = min(255, int((g / total_samples) / (final_a / 255.0)))
                final_b = min(255, int((b / total_samples) / (final_a / 255.0)))
            else:
                final_r = final_g = final_b = 0
            o_idx = (oy * size + ox) * 4
            out[o_idx:o_idx+4] = [final_r, final_g, final_b, int(final_a)]
    return out

def create_ico(png_map):
    count = len(png_map)
    header = struct.pack('<HHH', 0, 1, count)
    entries = []
    offset = 6 + count * 16
    data_chunks = []
    for s, png_bytes in png_map:
        w_byte = 0 if s >= 256 else s
        h_byte = 0 if s >= 256 else s
        size = len(png_bytes)
        entry = struct.pack('<BBBBHHII', w_byte, h_byte, 0, 0, 1, 32, size, offset)
        entries.append(entry)
        data_chunks.append(png_bytes)
        offset += size
    return header + b''.join(entries) + b''.join(data_chunks)

def main():
    os.makedirs('public', exist_ok=True)
    os.makedirs('app', exist_ok=True)

    # 1. Write SVGs
    with open('public/icon.svg', 'w') as f:
        f.write(ICON_SVG_512)
    with open('app/icon.svg', 'w') as f:
        f.write(ICON_SVG_32)
    with open('public/logo.svg', 'w') as f:
        f.write(LOGO_SVG_ADAPTIVE)
    with open('public/logo-dark.svg', 'w') as f:
        f.write(make_logo_svg('#F0F4F8'))
    with open('public/logo-light.svg', 'w') as f:
        f.write(make_logo_svg('#0A1116'))

    print('Wrote SVG logo and icon files.')

    # 2. Generate PNG icons
    sizes = [16, 32, 48, 64, 180, 192, 512]
    pngs = {}
    for s in sizes:
        print(f'Rendering {s}x{s} PNG...')
        png_data = make_png(s, s, render_icon(s))
        pngs[s] = png_data
        if s in [192, 512]:
            with open(f'public/icon-{s}.png', 'wb') as f:
                f.write(png_data)
        if s == 512:
            with open('public/icon.png', 'wb') as f:
                f.write(png_data)
        if s == 180:
            with open('public/apple-touch-icon.png', 'wb') as f:
                f.write(png_data)

    # 3. Generate multi-size ICO (16, 32, 48, 64)
    ico_entries = [(s, pngs[s]) for s in [16, 32, 48, 64]]
    ico_data = create_ico(ico_entries)
    with open('app/favicon.ico', 'wb') as f:
        f.write(ico_data)
    with open('public/favicon.ico', 'wb') as f:
        f.write(ico_data)

    print('Generated all compatible web icons, SVGs, PNGs, and favicons successfully!')

if __name__ == '__main__':
    main()
