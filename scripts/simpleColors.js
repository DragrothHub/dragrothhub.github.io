// // Reduce colors to found by k-mean
// function getBestFittingColor(colors, col) 
// {
//     var nearest;
//     var nearestDistsq = 1000000;
//     var l = colors.length;
//     for (var i = 0; i < l; i++)
//     {
//         var pcol = colors[i];

//         var distsq = Math.pow(pcol.r - col.r, 2) +
//             Math.pow(pcol.g - col.g, 2) +
//             Math.pow(pcol.b - col.b, 2);

//         if (distsq < nearestDistsq)
//         {
//             nearest = i;
//             nearestDistsq = distsq;
//         }
//     }

//     return nearest;
// }

// Reduce colors to found by k-mean (LAB version)
function getBestFittingColor(colors, col)
{
    var nearest = 0;
    var nearestDistsq = Infinity;

    // Zielpixel einmal umrechnen
    var lab = rgbToLab(col.r, col.g, col.b);

    var l = colors.length;
    for (var i = 0; i < l; i++)
    {
        var pcol = colors[i];

        // Palettenfarbe in LAB
        var plab = rgbToLab(pcol.r, pcol.g, pcol.b);

        var distsq =
            Math.pow(plab.l - lab.l, 2) +
            Math.pow(plab.a - lab.a, 2) +
            Math.pow(plab.b - lab.b, 2);

        if (distsq < nearestDistsq)
        {
            nearest = i;
            nearestDistsq = distsq;
        }
    }

    return nearest;
}

function imageDataToSimpColoredMat(imgData, colors)
{
    var mat = [];

    for (var i = 0; i < imgData.height; i++)
    {
        mat[i] = new Array(imgData.width);
    }

    for (var i = 0; i < imgData.data.length; i += 4)
    {
        var nearestI = getBestFittingColor(colors, {
            r: imgData.data[i],
            g: imgData.data[i + 1],
            b: imgData.data[i + 2]
        });
        var x = (i / 4) % imgData.width;
        var y = Math.floor((i / 4) / imgData.width);
        mat[y][x] = nearestI;
    }

    return mat;
}

function matToImageData(mat, colors, context)
{
    var imgData = context.createImageData(mat[0].length, mat.length);
    for (var y = 0; y < mat.length; y++)
    {
        for (var x = 0; x < mat[0].length; x++)
        {
            var i = (y * mat[0].length + x) * 4;
            var col = colors[mat[y][x]];
            imgData.data[i] = col.r;
            imgData.data[i + 1] = col.g;
            imgData.data[i + 2] = col.b;
            imgData.data[i + 3] = 255;
        }
    }
    return imgData;
}

async function getMedianFilteredImageData(width, height, ctx, colors, medianRadius)
{
    // Image data
    var imageData = ctx.getImageData(0, 0, width, height);

    // // Reduced colors (matrix)
    // var mat = imageDataToSimpColoredMat(imageData, colors);

    // // Reduced colors (imageData)
    // var newImageData = matToImageData(mat, colors, ctx);

    // // Median filter imageData
    // var imageData = await medianFilter(newImageData, medianRadius, colors, ctx);

    // return imageDataToSimpColoredMat(imageData, colors);

    return paintByNumbersPipeline(
        imageData,
        colors, // [{r,g,b}, ...]
        medianRadius // minimale Regionengröße
    );
}

function getOutlinedImageData(mat, ctx)
{
    // Create outline
    var outlineMat = outline(mat);
    return matToImageData(outlineMat, [{r:255,g:255,b:255},{r:0,g:0,b:0}], ctx);
}

function printOutlineResult(outlineImageData, labelPositions, width, height)
{
    var cvs = document.getElementById('resultOutlineCanvas');
    var cvsCtx = cvs.getContext('2d');
    cvs.height = height;
    cvs.width = width;
    cvsCtx.putImageData(outlineImageData, 0, 0);

    // Print labels
    cvsCtx.fillStyle = "#2d8a9b"; // Colored?
    for (var i = 0; i < labelPositions.length; i++)
    {
        var x = labelPositions[i].point.x;
        var y = labelPositions[i].point.y;
        //cvsCtx.fillRect(x, y, 1, 1);
        cvsCtx.fillText(labelPositions[i].color, x - 2, y + 4, 10);
    }

    cvs.style.width = '90%';
}

function printMedianFilteredResult(medianFilteredImageData, width, height)
{
    var cvs = document.getElementById('resultPreviewCanvas');
    var cvsCtx = cvs.getContext('2d');
    cvs.height = height;
    cvs.width = width;
    cvsCtx.putImageData(medianFilteredImageData, 0, 0);

    cvs.style.width = '90%';
}

function sleep(ms)
{
    return new Promise((r) =>
        setTimeout(r, ms));
}

function updateSplashDescription(event)
{
    console.log(event.detail);
    document.getElementById('loadingSplashText').innerHTML = event.detail;
}
document.getElementById('loadingSplash').addEventListener('splashUpdate', (e) => { updateSplashDescription(e) }, false);

async function processImageData(width, height, ctx, colors, medianRadius)
{
    var loadingSplash = document.getElementById('loadingSplash');
    loadingSplash.style.display = 'block';

    // loadingSplash.dispatchEvent(new CustomEvent('splashUpdate', { detail: 'Median Filter' }));
    loadingSplash.dispatchEvent(new CustomEvent('splashUpdate', { detail: 'CCL Regions' }));

    console.log('Start: getMedianFilteredImageData');
    // MedianFilter
    var medianFilteredMat = await getMedianFilteredImageData(width, height, ctx, colors, medianRadius);
    console.log('End: getMedianFilteredImageData');

    loadingSplash.dispatchEvent(new CustomEvent('splashUpdate', { detail: 'Generate Labels' }));
    
    console.log('Start: generateLabels');
    // Labels { matrix: mat, labels: labels}
    var matWithLabelsResult = await generateLabels(medianFilteredMat);
    printMedianFilteredResult(matToImageData(matWithLabelsResult.matrix, colors.concat({r:0,g:0,b:0}), ctx), width, height);
    console.log('End: generateLabels');

    loadingSplash.dispatchEvent(new CustomEvent('splashUpdate', { detail: 'Draw Outlines' }));

    console.log('Start: getOutlinedImageData');
    // Outline
    var outlineImageData = getOutlinedImageData(medianFilteredMat, ctx);
    printOutlineResult(outlineImageData, matWithLabelsResult.labels, width, height);
    console.log('End: getOutlinedImageData');

    var resultsGroup = document.getElementById('resultsGroup');
    resultsGroup.style.display = 'block';
    window.scrollTo(0, document.body.scrollHeight - resultsGroup.clientHeight);

    loadingSplash.style.display = 'none';
}

function getScaleForImage(img)
{
    return 1; // Deactivated for further testing

    var threshold = 1000;
    var maxPixels = Math.max(img.width, img.height);

    if(maxPixels < threshold)
    {
        return 1;
    }

    return 500 / maxPixels;
}

function reduceColors(colors, medianRadiusFactor)
{
    var ctx = document.getElementById('canvas').getContext('2d')

    var img = new Image();

    img.onload = function ()
    {
        // Scale image (reduce pixels to optimize performance)
        var scale = getScaleForImage(img);
        var newWidth = Math.round(img.width * scale);
        var newHeight = Math.round(img.height * scale);

        // Draw base image on ref canvas
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        var medianRadius = Math.round(medianRadiusFactor * (Math.max(img.width, img.height) / 100));

        console.log(medianRadius);

        processImageData(newWidth, newHeight, ctx, colors, medianRadius);
    }

    img.src = imageHolder.src;
}