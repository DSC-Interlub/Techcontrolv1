const fs = require('fs');
const path = require('path');
const potrace = require('potrace');
const ImageTracer = require('imagetracerjs');

const inputImagePath = path.join(__dirname, '..', 'public', 'plantas', 'planta_padronizada.png');
const rawSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_traced_raw.svg');
const styledSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_traced_styled.svg');

console.log('Starting trace for:', inputImagePath);

// 1. Potrace Vector Tracing (Black & White contour extraction)
potrace.trace(inputImagePath, {
  threshold: 180,
  turdSize: 4,
  optTolerance: 0.2,
  alphaMax: 1.0,
}, function(err, svgRaw) {
  if (err) {
    console.error('Error running potrace:', err);
    return;
  }

  // Ensure viewBox matches width 688 and height 1024
  let formattedRawSvg = svgRaw
    .replace(/<svg\s+([^>]+)>/, '<svg viewBox="0 0 688 1024" width="688" height="1024" xmlns="http://www.w3.org/2000/svg">');

  fs.writeFileSync(rawSvgPath, formattedRawSvg);
  console.log('Saved RAW trace SVG to:', rawSvgPath);

  // Analyze SVG paths inside raw trace
  const pathCount = (formattedRawSvg.match(/<path/g) || []).length;
  console.log(`Path count in raw trace: ${pathCount}`);

  // 2. Apply styling to raw traced SVG
  // Replace pure black fill with slate stroke and soft gray fill for shapes
  let formattedStyledSvg = formattedRawSvg
    .replace(/fill="black"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"')
    .replace(/fill="#000000"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"');

  fs.writeFileSync(styledSvgPath, formattedStyledSvg);
  console.log('Saved STYLED trace SVG to:', styledSvgPath);
});
