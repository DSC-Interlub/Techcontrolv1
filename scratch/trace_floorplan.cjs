const fs = require('fs');
const path = require('path');
const potrace = require('potrace');

const inputImagePath = path.join(__dirname, '..', 'public', 'plantas', 'planta_padronizada.png');
const rawSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_traced_raw.svg');
const styledSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_traced_styled.svg');

console.log('Starting trace for:', inputImagePath);

potrace.trace(inputImagePath, {
  threshold: 200,
  turdSize: 2,
  optTolerance: 0.1,
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

  const pathCount = (formattedRawSvg.match(/<path/g) || []).length;
  console.log(`Path count in raw trace: ${pathCount}`);

  // Also test imagetracerjs
  const ImageTracer = require('imagetracerjs');
  // Read image buffer
  // Save styled version
  let formattedStyledSvg = formattedRawSvg
    .replace(/fill="black"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"')
    .replace(/fill="#000000"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"');

  fs.writeFileSync(styledSvgPath, formattedStyledSvg);
  console.log('Saved STYLED trace SVG to:', styledSvgPath);
});
