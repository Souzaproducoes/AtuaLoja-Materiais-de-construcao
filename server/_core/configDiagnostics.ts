type ConfigItem = { key: string; description: string; required: boolean };

const CONFIG_ITEMS: ConfigItem[] = [
  { key: "DATABASE_URL", description: "ligação MySQL/TiDB para dados persistentes", required: true },
  { key: "JWT_SECRET", description: "assinatura segura das sessões", required: true },
  { key: "LOCAL_ADMIN_USERNAME", description: "utilizador do acesso administrativo local", required: false },
  { key: "LOCAL_ADMIN_PASSWORD", description: "password do acesso administrativo local", required: false },
  { key: "ALLOW_LOCAL_ADMIN_LOGIN", description: "permite login local em produção", required: false },
  { key: "NVIDIA_API_KEY", description: "chave do fornecedor LLM principal", required: false },
  { key: "NVIDIA_BASE_URL", description: "endpoint OpenAI-compatible principal", required: false },
  { key: "NVIDIA_MODEL", description: "modelo LLM principal", required: false },
  { key: "GROQ_API_KEY", description: "chave do fornecedor LLM alternativo", required: false },
  { key: "GROQ_BASE_URL", description: "endpoint OpenAI-compatible alternativo", required: false },
  { key: "GROQ_MODEL", description: "modelo LLM alternativo", required: false },
  { key: "SERVICE_API_URL", description: "serviço externo opcional de armazenamento", required: false },
  { key: "SERVICE_API_KEY", description: "credencial do serviço externo de armazenamento", required: false },
  { key: "VITE_ANALYTICS_ENDPOINT", description: "endpoint opcional de analytics", required: false },
  { key: "VITE_ANALYTICS_WEBSITE_ID", description: "identificador opcional de analytics", required: false },
];

export function getMissingConfig(env: NodeJS.ProcessEnv = process.env) { return CONFIG_ITEMS.filter(item => !env[item.key]?.trim()); }
export function hasLocalAdminConfig(env: NodeJS.ProcessEnv = process.env) { return Boolean(env.LOCAL_ADMIN_USERNAME?.trim() && env.LOCAL_ADMIN_PASSWORD?.trim()); }
export function hasAccessMethod(env: NodeJS.ProcessEnv = process.env) { return hasLocalAdminConfig(env); }
export function logConfigDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  const missing = getMissingConfig(env);
  const required = missing.filter(item => item.required);
  const optional = missing.filter(item => !item.required);
  if (required.length) console.warn("[Config] Configurações obrigatórias em falta:", required.map(item => item.key).join(", "));
  if (optional.length) console.warn("[Config] Configurações opcionais em falta:", optional.map(item => item.key).join(", "));
  if (!hasAccessMethod(env)) console.warn("[Config] Configure LOCAL_ADMIN_USERNAME e LOCAL_ADMIN_PASSWORD para aceder à gestão.");
}
