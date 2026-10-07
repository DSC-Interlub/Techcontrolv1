const xlsx = require('xlsx');
const path = 'C:/Users/kauan.pereira/.gemini/antigravity/brain/f22aadd9-4f99-4be7-b477-82e7a8f04bfb/.user_uploaded/media_1791375495010.xlsx';
const workbook = xlsx.readFile(path);
console.log('Sheet names:', workbook.SheetNames);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log('Total rows:', data.length);
console.log('Header row:', data[0]);
console.log('First 5 rows:');
for (let i = 1; i <= Math.min(10, data.length - 1); i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}

// Find rows with ESET or Barbara
data.forEach((row, idx) => {
  const rowStr = JSON.stringify(row);
  if (rowStr.toLowerCase().includes('barbara') || rowStr.toLowerCase().includes('inativo')) {
    console.log(`Matching Row ${idx}:`, row);
  }
});
