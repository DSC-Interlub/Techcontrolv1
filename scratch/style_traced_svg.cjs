const fs = require('fs');
const path = require('path');

const rawSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_imagetracer_raw.svg');
const styledSvgPath = path.join(__dirname, '..', 'public', 'plantas', 'planta_imagetracer_styled.svg');

let svgContent = fs.readFileSync(rawSvgPath, 'utf8');

// Replace background fill (white/near-white) with soft room background #F8FAFC
let styledSvg = svgContent
  .replace(/fill="rgb\(253,253,253\)"/g, 'fill="#F8FAFC" stroke="none"')
  .replace(/stroke="rgb\(253,253,253\)"/g, 'stroke="none"')
  
  // Replace dark black/near-black lines and furniture shapes with sleek slate palette (#EEF2F7 fill, #334155 stroke)
  .replace(/fill="rgb\(0,0,0\)"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"')
  .replace(/stroke="rgb\(0,0,0\)"/g, 'stroke="#334155" stroke-width="1.2" stroke-linejoin="round"')
  
  // Replace dark gray contours
  .replace(/fill="rgb\([0-9]{1,2},[0-9]{1,2},[0-9]{1,2}\)"/g, 'fill="#EEF2F7" stroke="#334155" stroke-width="1.2"')
  .replace(/stroke="rgb\([0-9]{1,2},[0-9]{1,2},[0-9]{1,2}\)"/g, 'stroke="#334155" stroke-width="1.2"');

fs.writeFileSync(styledSvgPath, styledSvg);
console.log('Successfully created styled traced SVG at:', styledSvgPath);
