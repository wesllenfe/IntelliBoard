const fs = require('fs');
const path = require('path');

const supabaseUrl    = process.env['SUPABASE_URL']      || '';
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || '';
const groqKey        = process.env['GROQ_KEY']           || '';

if (!supabaseUrl || !supabaseAnonKey || !groqKey) {
  console.warn('[set-env] Aviso: uma ou mais variáveis de ambiente estão ausentes.');
}

const content = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  groqKey: '${groqKey}',
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, content);
console.log('[set-env] environment.prod.ts gerado com sucesso.');
