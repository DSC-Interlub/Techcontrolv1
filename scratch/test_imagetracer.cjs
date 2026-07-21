const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const ImageTracer = require('imagetracerjs');

const inputImagePath = path.join(__dirname, '..', 'public', 'plantas', 'planta_padronizada.png');
const rawSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_imagetracer_raw.svg');

fs.createReadStream(inputImagePath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    const imgd = {
      width: this.width,
      height: this.height,
      data: this.data
    };
    const options = {
      corsenabled: false,
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      rightangleenhance: true,
      colorsampling: 2,
      numberofcolors: 4,
      mincolorratio: 0.02,
      colorquantcycles: 3,
      layering: 0,
      strokewidth: 1,
      linefilter: false,
      scale: 1,
      roundcoords: 1,
      viewbox: true,
      desc: false
    };

    const svgString = ImageTracer.imagedataToSVG(imgd, options);
    fs.writeFileSync(rawSvgPath, svgString);
    console.log('Saved ImageTracer SVG to:', rawSvgPath);
    const pathCount = (svgString.match(/<path/g) || []).length;
    console.log(`Path count in ImageTracer SVG: ${pathCount}`);
  });
