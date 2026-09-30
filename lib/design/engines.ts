export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (shortResult) {
      return {
        r: parseInt(shortResult[1] + shortResult[1], 16),
        g: parseInt(shortResult[2] + shortResult[2], 16),
        b: parseInt(shortResult[3] + shortResult[3], 16),
      };
    }
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// Color palette generation
export type PaletteType = 'complementary' | 'triadic' | 'analogous' | 'split-complementary' | 'tetradic' | 'monochromatic' | 'shades';

export function generatePalette(hex: string, type: PaletteType): string[] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [];
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;

  const result: { h: number, s: number, l: number }[] = [];
  result.push({ h, s, l });

  switch (type) {
    case 'complementary':
      result.push({ h: (h + 180) % 360, s, l });
      break;
    case 'triadic':
      result.push({ h: (h + 120) % 360, s, l });
      result.push({ h: (h + 240) % 360, s, l });
      break;
    case 'analogous':
      result.push({ h: (h + 30) % 360, s, l });
      result.push({ h: (h + 60) % 360, s, l });
      result.push({ h: (h - 30 + 360) % 360, s, l });
      result.push({ h: (h - 60 + 360) % 360, s, l });
      break;
    case 'split-complementary':
      result.push({ h: (h + 150) % 360, s, l });
      result.push({ h: (h + 210) % 360, s, l });
      break;
    case 'tetradic':
      result.push({ h: (h + 90) % 360, s, l });
      result.push({ h: (h + 180) % 360, s, l });
      result.push({ h: (h + 270) % 360, s, l });
      break;
    case 'monochromatic':
    case 'shades':
      result.push({ h, s, l: Math.max(0, l - 20) });
      result.push({ h, s, l: Math.max(0, l - 40) });
      result.push({ h, s, l: Math.min(100, l + 20) });
      result.push({ h, s, l: Math.min(100, l + 40) });
      break;
  }

  return result.map(c => hslToHex(c.h, c.s, c.l));
}

// CSS generation helpers
export function makeCssGradient(type: 'linear' | 'radial', angle: number, colors: string[], positions: number[]): string {
  const stops = colors.map((c, i) => `${c} ${positions[i]}%`).join(', ');
  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${stops})`;
  } else {
    return `radial-gradient(circle, ${stops})`;
  }
}

export function makeCssShadow(x: number, y: number, blur: number, spread: number, color: string, inset: boolean, opacity: number): string {
  const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };
  const insetStr = inset ? 'inset ' : '';
  return `${insetStr}${x}px ${y}px ${blur}px ${spread}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function makeGlassmorphismCss(blur: number, opacity: number, borderOpacity: number, bgColor: string): { backdrop: string; background: string; border: string } {
  const rgb = hexToRgb(bgColor) || { r: 255, g: 255, b: 255 };
  return {
    backdrop: `blur(${blur}px)`,
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
    border: `1px solid rgba(255, 255, 255, ${borderOpacity})`
  };
}

export function makeBorderRadiusCss(tl: number, tr: number, br: number, bl: number, isPercent: boolean = false): string {
  const unit = isPercent ? '%' : 'px';
  return `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`;
}

// SVG generators
export function generateSvgBlob(complexity: number, seed: number): string {
  // Simple seeded random
  const random = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const points: {x: number, y: number}[] = [];
  const angleStep = (Math.PI * 2) / complexity;
  for (let i = 0; i < complexity; i++) {
    const angle = i * angleStep;
    const radius = 40 + random(seed + i) * 20; // radius between 40 and 60
    points.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius
    });
  }

  // Create smooth path using cubic beziers (Catmull-Rom to Bezier)
  const path = [];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    if (i === 0) {
      path.push(`M ${p1.x},${p1.y}`);
    }
    path.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="${path.join(' ')}" fill="currentColor" />
</svg>`;
}

export function generateSvgWave(type: 'sine' | 'triangle' | 'peaks', amplitude: number, frequency: number, color: string, height: number, flip: boolean): string {
  const width = 1440;
  const h = height;
  let path = `M 0,${h} `;
  
  if (type === 'sine') {
    path += `L 0,${h/2} `;
    for (let x = 0; x <= width; x += 10) {
      const y = h/2 + Math.sin((x / width) * frequency * Math.PI * 2) * amplitude;
      path += `L ${x},${y} `;
    }
    path += `L ${width},${h/2} `;
  } else if (type === 'triangle') {
    path += `L 0,${h/2} `;
    for (let x = 0; x <= width; x += 10) {
      // rough triangle
      const phase = ((x / width) * frequency) % 1;
      const y = h/2 + (phase < 0.5 ? (phase * 4 - 1) * amplitude : ((1 - phase) * 4 - 1) * amplitude);
      path += `L ${x},${y} `;
    }
    path += `L ${width},${h/2} `;
  } else {
    // peaks
    path += `L 0,${h/2} `;
    for (let x = 0; x <= width; x += 10) {
      const y = h/2 + Math.abs(Math.sin((x / width) * frequency * Math.PI)) * amplitude;
      path += `L ${x},${y} `;
    }
    path += `L ${width},${h/2} `;
  }
  
  path += `L ${width},${h} Z`;
  
  const transform = flip ? `transform="scale(1, -1) translate(0, -${h})"` : '';
  
  return `<svg viewBox="0 0 ${width} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${path}" fill="${color}" ${transform}/>
</svg>`;
}
