// All scripts for image processing have to be loaded here
let foundColors = undefined;
var numberOfColors = 10;
var medianRadius = 10;
var detailsSelect = document.getElementById('detailsSelect');
var findColorsButton = document.getElementById('findColorsButton');
var generateButton = document.getElementById('generateButton');
var colorDivContainer = document.getElementById('colorDivContainerId');
var detailsAndGenerateGroup = document.getElementById('detailsAndGenerateGroup');
var resultsGroup = document.getElementById('resultsGroup');
var medianSelect = document.getElementById('medianSelect');
var shapeSelectRow = document.getElementById('shapeSelectRow');

medianSelect.addEventListener("change", function() {
    var medianValue = document.getElementById('medianSelect').value;
    if(medianValue == 'old')
    {
        shapeSelectRow.style.display = 'none';
    }
    else 
    {
        shapeSelectRow.style.display = '';
    }
});

findColorsButton.onclick = function()
{
    resultsGroup.style.display = 'none';
    findColors();
}

generateButton.onclick = function()
{
    resultsGroup.style.display = 'none';
    processImage();
}

function findColors()
{
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d')

    var img = new Image();

    img.onload = function ()
    {
        // foundColors = findColorsWithKmeans(img, ctx, numberOfColors);
        ctx.drawImage(img, 0, 0, 200, 200);
        var imageData = ctx.getImageData(0, 0, 200, 200).data;
        foundColors = extractPalette(imageData, numberOfColors);

        // Scale image (reduce pixels to optimize performance)
        var scale = getScaleForImage(img);
        var newWidth = Math.round(img.width * scale);
        var newHeight = Math.round(img.height * scale);

        canvas.height = newHeight;
        canvas.width = newWidth;
        ctx.drawImage(img, 0, 0);

        for (var i = 0; i < foundColors.length; i++)
        {
            var hexColor = rgbToHex(foundColors[i]);

            var p = document.getElementById('c'+ (i + 1));
            p.style.backgroundColor = hexColor;
        }

        detailsAndGenerateGroup.style.display = 'block';
        colorDivContainer.style.display = 'inline-flex';

        window.scrollTo(0, document.body.scrollHeight - detailsAndGenerateGroup.clientHeight);
    }
    img.src = imageHolder.src;
}

function processImage()
{

    // Switch detail depending on slider
    switch(detailsSelect.value)
    {
        case '1':
            medianRadiusFactor = 2.5;
            break
        case '2':
            medianRadiusFactor = 2.0;
            break
        case '3':
            medianRadiusFactor = 1.5;
            break;
        case '4':
            medianRadiusFactor = 1.0;
            break;
        case '5':
            medianRadiusFactor = 0.5;
            break;
    }

    reduceColors(foundColors, medianRadiusFactor);

    loadingSplash.style.display = 'none';
}