import math
import struct
import zlib
import os

# Brand Identity: #0E98A7
# Style: edge - sharp 2px corners, minimal

# 1. Generate SVG strings
ICON_SVG_32 = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">
  <rect width="32" height="32" rx="2" fill="#0E98A7"/>
  <g transform="translate(4, 4)">
    <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>'''

ICON_SVG_512 = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <rect width="512" height="512" rx="32" fill="#0E98A7"/>
  <g transform="translate(64, 64) scale(16)">
    <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>'''

def make_logo_svg(text_color):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40" width="190" height="40" fill="none">
  <!-- Brand Mark Icon (edge style) -->
  <rect x="2" y="2" width="36" height="36" rx="2" fill="#0E98A7"/>
  <g transform="translate(8, 8)">
    <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <!-- Wordmark -->
  <text x="48" y="27" font-family="'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.03em" fill="{text_color}">whysogood</text>
</svg>'''

LOGO_SVG_ADAPTIVE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40" width="190" height="40" fill="none">
  <style>
    .wordmark { fill: #0A1517; }
    @media (prefers-color-scheme: dark) {
      .wordmark { fill: #F0F6F7; }
    }
  </style>
  <rect x="2" y="2" width="36" height="36" rx="2" fill="#0E98A7"/>
  <g transform="translate(8, 8)">
    <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="48" y="27" class="wordmark" font-family="'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="-0.03em">whysogood</text>
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

def render_icon(size):
    ss = 4
    W = size * ss
    H = size * ss
    img = bytearray(W * H * 4)

    # Edge style: 2px corner radius scaled
    rad = max(2.0, size * (2.0 / 32.0)) * ss
    margin = size * 0.04 * ss
    r_left = margin
    r_top = margin
    r_right = W - margin
    r_bottom = H - margin

    pts = [
        (15.914, 4.0), (14.677, 2.5), (13.44, 2.439),
        (4.44, 11.439), (4.8, 13.2), (5.5, 14.0),
        (9.502, 14.0), (10.0, 14.7),
        (8.086, 20.0), (9.323, 21.5), (10.561, 21.56),
        (19.561, 12.56), (19.2, 10.8), (18.5, 10.0),
        (14.503, 10.0), (14.0, 9.3),
    ]

    icon_scale = size * 0.65 * ss / 24.0
    cx = W / 2
    cy = H / 2
    poly = [(cx + (x - 12) * icon_scale, cy + (y - 12) * icon_scale) for x, y in pts]

    def point_in_poly(x, y, p):
        inside = False
        n = len(p)
        p1x, p1y = p[0]
        for i in range(n + 1):
            p2x, p2y = p[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    for y in range(H):
        for x in range(W):
            dx = max(r_left + rad - x, 0, x - (r_right - rad))
            dy = max(r_top + rad - y, 0, y - (r_bottom - rad))
            in_rect = (dx*dx + dy*dy <= rad*rad)
            idx = (y * W + x) * 4
            if in_rect:
                if point_in_poly(x, y, poly):
                    img[idx:idx+4] = [255, 255, 255, 255]
                else:
                    # #0E98A7 -> RGB: 14, 152, 167
                    img[idx:idx+4] = [14, 152, 167, 255]
            else:
                img[idx:idx+4] = [0, 0, 0, 0]

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

    # Write SVGs
    with open('public/icon.svg', 'w') as f:
        f.write(ICON_SVG_512)
    with open('app/icon.svg', 'w') as f:
        f.write(ICON_SVG_32)
    with open('public/logo.svg', 'w') as f:
        f.write(LOGO_SVG_ADAPTIVE)
    with open('public/logo-dark.svg', 'w') as f:
        f.write(make_logo_svg('#F0F6F7'))
    with open('public/logo-light.svg', 'w') as f:
        f.write(make_logo_svg('#0A1517'))

    print('Wrote SVG logo and icon files.')

    # Generate PNG icons
    sizes = [16, 32, 48, 64, 192, 512]
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

    # Generate multi-size ICO (16, 32, 48, 64)
    ico_entries = [(s, pngs[s]) for s in [16, 32, 48, 64]]
    ico_data = create_ico(ico_entries)
    with open('app/favicon.ico', 'wb') as f:
        f.write(ico_data)
    with open('public/favicon.ico', 'wb') as f:
        f.write(ico_data)

    print('Generated app/favicon.ico and public/favicon.ico with whysogood logo!')

if __name__ == '__main__':
    main()
