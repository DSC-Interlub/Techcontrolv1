const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const migFile = path.join(__dirname, '../supabase/migrations/20261006000000_ciclo_vida_salas_antivirus_conformidade.sql');
const sql = fs.readFileSync(migFile, 'utf8');

console.log('--- Executando Migração no Supabase via CLI ---');
try {
  // Use temporary file for input to supabase db query or pass via stdin
  const tempSql = path.join(__dirname, 'temp_mig.sql');
  fs.writeFileSync(tempSql, sql, 'utf8');
  
  const output = execSync(`npx supabase db query --linked -f "${tempSql}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  console.log('Resultado:');
  console.log(output);
  
  fs.unlinkSync(tempSql);
  console.log('✅ Migração executada com sucesso!');
} catch (err) {
  console.error('❌ Erro ao executar migração:', err.stdout || err.message);
  process.exit(1);
}
