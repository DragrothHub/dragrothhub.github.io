/* =========================================
   1. Pixel → Label (Palette-Zuordnung)
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
   2. Connected Components (Regionen)
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
   3. Kleine Regionen mergen
   ========================================= */

function mergeSmallRegions(regions, labelMap, width, minSize) {
  for (const region of regions) {
    if (region.pixels.length >= minSize) continue;

    const neighborCount = {};

    for (const idx of region.pixels) {
      const x = idx % width;
      const y = (idx / width) | 0;

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
   4. Labels → ImageData
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
   Public Pipeline API
   ========================================= */

/**
 * @param {ImageData} imageData
 * @param {{r:number,g:number,b:number}[]} colors
 * @param {number} minRegionSize
 * @returns {ImageData}
 */
function paintByNumbersPipeline(
  imageData,
  colors,
  minRegionSize = 20
) {
  const { width, height } = imageData;

  const labels = assignLabels(imageData, colors);
  const regions = findRegions(labels, width, height);
  mergeSmallRegions(regions, labels, width, minRegionSize);

  return labelsToImageData(labels, colors, width, height);
}
