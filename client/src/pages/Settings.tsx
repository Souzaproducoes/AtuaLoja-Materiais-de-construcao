import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { toast } from "sonner";
import {
  ArrowLeft,
  Database,
  Globe,
  Key,
  LogOut,
  Server,
  ShieldCheck,
  Store,
  Truck,
  User,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#214d39]/10 text-[#214d39]">
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-bold text-[#214d39]">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const configQuery = trpc.admin.systemConfig.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated && !!user && ["admin", "manager"].includes(user.role),
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Sessão encerrada.");
      window.location.href = "/";
    },
  });

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee] text-sm text-[#214d39]">
        A validar o acesso...
      </div>
    );

  if (!isAuthenticated)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6 text-center">
        <div className="rounded-3xl bg-white p-8">
          <h1 className="text-xl font-bold text-[#214d39]">
            Entre para ver as configurações.
          </h1>
          <button
            onClick={() => startLogin()}
            className="mt-5 rounded-full bg-[#214d39] px-5 py-3 text-xs font-bold text-white"
          >
            Entrar
          </button>
        </div>
      </div>
    );

  if (!user || !["admin", "manager"].includes(user.role))
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6 text-center">
        <div className="rounded-3xl bg-white p-8">
          <h1 className="text-xl font-bold text-[#214d39]">Acesso restrito à gestão.</h1>
        </div>
      </div>
    );

  const config = configQuery.data;

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#2b302b]">
      <header className="border-b border-[#e5dbcc] bg-[#fffdf8] px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/gestao"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#214d39]"
          >
            <ArrowLeft size={16} /> Gestão
          </Link>
          <span className="text-xs font-bold uppercase tracking-[.16em] text-[#9b5b35]">
            Configurações
          </span>
          <a
            href="https://wa.me/5562991444852?text=Olá%20Souza%20produções,%20preciso%20de%20suporte%20na%20Atua%20Loja."
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#9b5b35]"
          >
            Souza produções ↗
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#9b5b35]">
          Sistema
        </p>
        <h1 className="mt-2 text-4xl font-bold text-[#214d39]">Configurações</h1>
        <p className="mt-2 text-sm text-[#817669]">
          Estado do sistema, loja e integrações. As credenciais e chaves de API nunca
          são expostas nesta página.
        </p>

        <div className="mt-8 grid gap-6">
          {/* Store Info */}
          <Section title="Loja" icon={Store}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-[#62584e]">Nome</p>
                <p className="mt-1 text-sm text-[#2b302b]">
                  {config?.storeName || "Atua Loja"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Cidade</p>
                <p className="mt-1 text-sm text-[#2b302b]">
                  {config?.storeCity || "Niquelândia, GO"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Telefone / WhatsApp</p>
                <p className="mt-1 text-sm text-[#2b302b]">
                  {config?.storePhone || "+55 62 99144-4852"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Ambiente</p>
                <p className="mt-1 text-sm text-[#2b302b]">
                  {config?.isProduction ? "Produção" : "Desenvolvimento / Staging"}
                </p>
              </div>
            </div>
          </Section>

          {/* Current User */}
          <Section title="Sessão atual" icon={User}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-[#62584e]">Nome</p>
                <p className="mt-1 text-sm text-[#2b302b]">{user.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Email</p>
                <p className="mt-1 text-sm text-[#2b302b]">{user.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Função</p>
                <p className="mt-1 text-sm capitalize text-[#2b302b]">{user.role}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#62584e]">Último acesso</p>
                <p className="mt-1 text-sm text-[#2b302b]">
                  {user.lastSignedIn
                    ? new Date(user.lastSignedIn).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              Encerrar sessão
            </button>
          </Section>

          {/* System Status */}
          <Section title="Estado do sistema" icon={Server}>
            {configQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#817669]">
                <Loader2 className="size-4 animate-spin" /> A carregar...
              </div>
            ) : configQuery.isError ? (
              <p className="text-sm text-red-600">
                Erro ao carregar configurações do sistema.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-[#817669]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2b302b]">Base de dados</p>
                      <p className="text-xs text-[#817669]">MySQL via Drizzle ORM</p>
                    </div>
                  </div>
                  <StatusBadge ok={!!config?.hasDatabase} label={config?.hasDatabase ? "Ligada" : "Não configurada"} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-[#817669]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2b302b]">Login externo</p>
                      <p className="text-xs text-[#817669]">Autenticação externa opcional</p>
                    </div>
                  </div>
                  <StatusBadge ok={!!config?.hasOAuth} label={config?.hasOAuth ? "Configurado" : "Não configurado"} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Key size={16} className="text-[#817669]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2b302b]">Login local</p>
                      <p className="text-xs text-[#817669]">Credenciais no .env do servidor</p>
                    </div>
                  </div>
                  <StatusBadge ok={!!config?.hasLocalLogin} label={config?.hasLocalLogin ? "Configurado" : "Não configurado"} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-[#817669]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2b302b]">Assistente IA (ASK)</p>
                      <p className="text-xs text-[#817669]">
                        {config?.llmProviders && config.llmProviders.length > 0
                          ? config.llmProviders.map((p) => p.name).join(", ")
                          : "Nenhum provedor configurado"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    ok={!!(config?.llmProviders && config.llmProviders.length > 0)}
                    label={
                      config?.llmProviders && config.llmProviders.length > 0
                        ? `${config.llmProviders.length} provedor(es)`
                        : "Indisponível"
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-[#817669]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2b302b]">Serviço externo</p>
                      <p className="text-xs text-[#817669]">API integrada opcional</p>
                    </div>
                  </div>
                  <StatusBadge ok={!!config?.hasService} label={config?.hasService ? "Configurado" : "Não configurado"} />
                </div>
              </div>
            )}
          </Section>

          {/* Quick Links */}
          <Section title="Links rápidos" icon={Truck}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/gestao/relatorios"
                className="flex items-center gap-3 rounded-xl border border-[#e5dbcc] bg-white px-4 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#f3e4d0] transition-colors"
              >
                Ver relatórios →
              </Link>
              <Link
                href="/assistente"
                className="flex items-center gap-3 rounded-xl border border-[#e5dbcc] bg-white px-4 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#f3e4d0] transition-colors"
              >
                Assistente IA (ASK) →
              </Link>
              <Link
                href="/gestao/catalogo"
                className="flex items-center gap-3 rounded-xl border border-[#e5dbcc] bg-white px-4 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#f3e4d0] transition-colors"
              >
                Gestão de catálogo →
              </Link>
              <Link
                href="/gestao/operacao"
                className="flex items-center gap-3 rounded-xl border border-[#e5dbcc] bg-white px-4 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#f3e4d0] transition-colors"
              >
                Operação e entregas →
              </Link>
            </div>
          </Section>

          {/* Info */}
          <div className="rounded-2xl border border-[#e5dbcc] bg-[#fff8ee] p-5 text-xs leading-6 text-[#7b5a3c]">
            <p className="font-bold">Nota de segurança</p>
            <p className="mt-1">
              As chaves de API, passwords e credenciais nunca são expostas nesta
              página. Para alterar configurações de servidor, edite o ficheiro{" "}
              <code className="rounded bg-[#f3e4d0] px-1.5 py-0.5 font-mono text-[#9b5b35]">
                .env
              </code>{" "}
              no servidor e reinicie o processo.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
