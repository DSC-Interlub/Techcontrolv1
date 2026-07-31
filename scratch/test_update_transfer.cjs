const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oskuejukhcnuhvcivcsr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9za3VlanVraGNudWh2Y2l2Y3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDgzNTksImV4cCI6MjEwMDEyNDM1OX0.HHy0JPVn0VHjzQ7B8ildXWiNzgnVF_xD0QE2D4ulndU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  console.log("Testing REST PATCH update on pcs_internos 02f24456-1570-4482-a2be-b94fd2250db3...");

  // Sanitize simulation
  const sanitizeData = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim() === '') {
        const isUuidField = key === 'colaborador_id' || key === 'solicitante_id' || key === 'responsavel_id' || key.endsWith('_id');
        const isDateField = key.startsWith('data_') || 
                            key.endsWith('_desde') || 
                            key.endsWith('_ate') || 
                            key.endsWith('_nascimento') || 
                            key.endsWith('_admissao') || 
                            key.endsWith('_desligamento') || 
                            key.endsWith('_date') || 
                            key === 'data';
        if (isUuidField || isDateField) {
          cleaned[key] = null;
          continue;
        }
      }
      cleaned[key] = value;
    }
    return cleaned;
  };

  const payloadOriginal = {
    usuario_atual: "",
    colaborador_id: null,
    usuario_desde: "", // Empty string
    area: "",
    status: "Disponível"
  };

  const payloadSanitized = sanitizeData(payloadOriginal);
  console.log("Payload Sanitized:", payloadSanitized);

  const { data, error } = await supabase
    .from('pcs_internos')
    .update(payloadSanitized)
    .eq('id', '02f24456-1570-4482-a2be-b94fd2250db3')
    .select();

  if (error) {
    console.error("❌ ERRO:", error);
  } else {
    console.log("✅ SUCESSO!", data);
  }
}

testUpdate();
