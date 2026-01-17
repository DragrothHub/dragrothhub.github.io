/* ===============================
   RGB <-> LAB
   =============================== */

function rgbToXyz(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  return {
    x: (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
    y: (r * 0.2126 + g * 0.7152 + b * 0.0722),
    z: (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  };
}

function xyzToLab(x, y, z) {
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  return {
    l: 116 * f(y) - 16,
    a: 500 * (f(x) - f(y)),
    b: 200 * (f(y) - f(z))
  };
}

function rgbToLab(r, g, b) {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

function labToRgb(l, a, b) {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const f = t => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;

  x = 0.95047 * f(x);
  y = f(y);
  z = 1.08883 * f(z);

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 + y * -0.2040 + z * 1.0570;

  const gamma = v =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  return {
    r: Math.min(255, Math.max(0, Math.round(gamma(r) * 255))),
    g: Math.min(255, Math.max(0, Math.round(gamma(g) * 255))),
    b: Math.min(255, Math.max(0, Math.round(gamma(bl) * 255)))
  };
}

function rgbToHex({ r, g, b }) {
  return (
    "#" +
    [r, g, b]
      .map(v => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/* ===============================
   K-Means++
   =============================== */

function initKMeansPlusPlus(pixels, k) {
  const centroids = [];
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

  while (centroids.length < k) {
    const distances = pixels.map(p => {
      let min = Infinity;
      for (const c of centroids) {
        const d =
          (p.l - c.l) ** 2 +
          (p.a - c.a) ** 2 +
          (p.b - c.b) ** 2;
        min = Math.min(min, d);
      }
      return min;
    });

    const sum = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;

    for (let i = 0; i < pixels.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push(pixels[i]);
        break;
      }
    }
  }

  return centroids.map(c => ({ ...c }));
}

/* ===============================
   K-Means mit Konvergenz
   =============================== */

function kMeans(pixels, k, maxIterations = 20, epsilon = 0.5) {
  let centroids = initKMeansPlusPlus(pixels, k);
  let assignments = new Array(pixels.length);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let minDist = Infinity;

      for (let c = 0; c < k; c++) {
        const d =
          (pixels[i].l - centroids[c].l) ** 2 +
          (pixels[i].a - centroids[c].a) ** 2 +
          (pixels[i].b - centroids[c].b) ** 2;

        if (d < minDist) {
          minDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    // Update + Shift messen
    const sums = Array.from({ length: k }, () => ({
      l: 0, a: 0, b: 0, count: 0
    }));

    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c].l += pixels[i].l;
      sums[c].a += pixels[i].a;
      sums[c].b += pixels[i].b;
      sums[c].count++;
    }

    let maxShift = 0;

    for (let c = 0; c < k; c++) {
      if (!sums[c].count) continue;

      const next = {
        l: sums[c].l / sums[c].count,
        a: sums[c].a / sums[c].count,
        b: sums[c].b / sums[c].count
      };

      const shift =
        (centroids[c].l - next.l) ** 2 +
        (centroids[c].a - next.a) ** 2 +
        (centroids[c].b - next.b) ** 2;

      maxShift = Math.max(maxShift, shift);
      centroids[c] = next;
    }

    if (maxShift < epsilon ** 2) break;
  }

  return centroids;
}

/* ===============================
   Public API
   =============================== */

/**
 * @param {ImageData} imageData
 * @param {number} colorCount
 * @returns {string[]} HEX colors
 */
export function extractPalette(imageData, colorCount) {
  const { data } = imageData;
  const pixels = [];

  for (let i = 0; i < data.length; i += 4) {
    pixels.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
  }

  const centroids = kMeans(pixels, colorCount);

  return centroids.map(c =>
    rgbToHex(labToRgb(c.l, c.a, c.b))
  );
}