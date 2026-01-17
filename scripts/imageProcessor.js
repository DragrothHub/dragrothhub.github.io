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
        foundColors = findColorsWithKmeans(img, ctx, numberOfColors);

        // Scale image (reduce pixels to optimize performance)
        var scale = getScaleForImage(img);
        var newWidth = Math.round(img.width * scale);
        var newHeight = Math.round(img.height * scale);

        canvas.height = newHeight;
        canvas.width = newWidth;
        ctx.drawImage(img, 0, 0);

        var foundColorsHex = [];
        for (var i = 0; i < foundColors.length; i++)
        {
            foundColorsHex.push(rgbToHex(foundColors[i]));
        }

        var p1 = document.getElementById('c1');
        var p2 = document.getElementById('c2');
        var p3 = document.getElementById('c3');
        var p4 = document.getElementById('c4');
        var p5 = document.getElementById('c5');

        p1.style.backgroundColor = foundColorsHex[0];
        p2.style.backgroundColor = foundColorsHex[1];
        p3.style.backgroundColor = foundColorsHex[2];
        p4.style.backgroundColor = foundColorsHex[3];
        p5.style.backgroundColor = foundColorsHex[4];

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