/* =========================================
   RGB <-> LAB
   ========================================= */

function rgbToXyz(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

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

/* =========================================
   1. Pixel → Label (LAB)
   ========================================= */

function assignLabels(imageData, colors) {
  const { data, width, height } = imageData;
  const labels = new Uint16Array(width * height);

  const paletteLab = colors.map(c => rgbToLab(c.r, c.g, c.b));

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);

    let best = 0;
    let min = Infinity;

    for (let c = 0; c < paletteLab.length; c++) {
      const d =
        (paletteLab[c].l - lab.l) ** 2 +
        (paletteLab[c].a - lab.a) ** 2 +
        (paletteLab[c].b - lab.b) ** 2;

      if (d < min) {
        min = d;
        best = c;
      }
    }

    labels[p] = best;
  }

  return labels;
}

/* =========================================
   2. Majority Vote Filter (Label-basiert)
   ========================================= */

function majorityFilter(labels, width, height, iterations = 2) {
  const out = new Uint16Array(labels.length);
  const dirs = [-1, 0, 1];

  for (let it = 0; it < iterations; it++) {
    out.set(labels);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const count = {};

        for (const dy of dirs) {
          for (const dx of dirs) {
            const v = labels[idx + dy * width + dx];
            count[v] = (count[v] || 0) + 1;
          }
        }

        let best = labels[idx];
        let max = 0;

        for (const k in count) {
          if (count[k] > max) {
            max = count[k];
            best = Number(k);
          }
        }

        out[idx] = best;
      }
    }

    labels.set(out);
  }
}

/* =========================================
   3. Connected Components
   ========================================= */

function findRegions(labelMap, width, height) {
  const visited = new Uint8Array(labelMap.length);
  const regions = [];

  const dirs = [
    [1, 0], [-1, 0],
    [0, 1], [0, -1]
  ];

  for (let i = 0; i < labelMap.length; i++) {
    if (visited[i]) continue;

    const label = labelMap[i];
    const stack = [i];
    const pixels = [];
    visited[i] = 1;

    while (stack.length) {
      const idx = stack.pop();
      pixels.push(idx);

      const x = idx % width;
      const y = (idx / width) | 0;

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const nidx = ny * width + nx;
        if (!visited[nidx] && labelMap[nidx] === label) {
          visited[nidx] = 1;
          stack.push(nidx);
        }
      }
    }

    regions.push({ label, pixels });
  }

  return regions;
}

/* =========================================
   4. Kleine Regionen mergen
   ========================================= */

function mergeSmallRegions(regions, labelMap, width, minSize) {
  for (const region of regions) {
    if (region.pixels.length >= minSize) continue;

    const neighborCount = {};

    for (const idx of region.pixels) {
      const neighbors = [
        idx - 1, idx + 1,
        idx - width, idx + width
      ];

      for (const n of neighbors) {
        if (n < 0 || n >= labelMap.length) continue;
        if (labelMap[n] !== region.label) {
          neighborCount[labelMap[n]] =
            (neighborCount[labelMap[n]] || 0) + 1;
        }
      }
    }

    let bestLabel = region.label;
    let max = 0;

    for (const k in neighborCount) {
      if (neighborCount[k] > max) {
        max = neighborCount[k];
        bestLabel = Number(k);
      }
    }

    for (const idx of region.pixels) {
      labelMap[idx] = bestLabel;
    }
  }
}

/* =========================================
   5. Labels → ImageData
   ========================================= */

function labelsToImageData(labelMap, colors, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < labelMap.length; i++) {
    const c = colors[labelMap[i]];
    const o = i * 4;
    out[o] = c.r;
    out[o + 1] = c.g;
    out[o + 2] = c.b;
    out[o + 3] = 255;
  }

  return new ImageData(out, width, height);
}

/* =========================================
   Public Pipeline
   ========================================= */

/**
 * @param {ImageData} imageData
 * @param {{r:number,g:number,b:number}[]} colors
 * @param {number} minRegionSize
 * @param {number} majorityIterations
 * @returns {ImageData}
 */
function paintByNumbersPipeline(
  imageData,
  colors,
  minRegionSize = 120,
  majorityIterations = 2
) {
  const { width, height } = imageData;

  const labels = assignLabels(imageData, colors);

  // 🔴 DAS ist der entscheidende Schritt
  majorityFilter(labels, width, height, majorityIterations);

  const regions = findRegions(labels, width, height);
  mergeSmallRegions(regions, labels, width, minRegionSize);

  return labelsToImageData(labels, colors, width, height);
}
