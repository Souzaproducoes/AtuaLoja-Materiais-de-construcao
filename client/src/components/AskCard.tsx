import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Sparkles, Minus, ShieldCheck } from "lucide-react";
import { useStreamingChat, type ChatMessage } from "@/hooks/useStreamingChat";
import { useAuth } from "@/_core/hooks/useAuth";
import { Streamdown } from "streamdown";

type ModuleKey = "customer" | "delivery" | "admin" | "catalog" | "inventory" | "finance" | "crm" | "security" | "seo" | "pwa";

type UserRole = "user" | "admin" | "manager" | "sales" | "stock" | "logistics";

const ALL_MODULES: Record<ModuleKey, { label: string; dot: string; prompts: string[]; roles: UserRole[] }> = {
  admin: {
    label: "Admin",
    dot: "#8b5cf6",
    prompts: ["Resumo do dashboard de hoje", "Estoque abaixo do mínimo", "Relatório financeiro do mês"],
    roles: ["admin", "manager"],
  },
  delivery: {
    label: "Entregas",
    dot: "#f59e0b",
    prompts: ["Entregas pendentes de hoje", "Status da entrega #1234", "Rota otimizada para amanhã"],
    roles: ["admin", "manager", "logistics"],
  },
  customer: {
    label: "Clientes",
    dot: "#10b981",
    prompts: ["Quais clientes mais compraram este mês?", "Busque o cliente João da Silva", "Resumo de vendas por cliente"],
    roles: ["admin", "manager", "logistics", "sales", "stock", "user"],
  },
  catalog: {
    label: "Catálogo",
    dot: "#06b6d4",
    prompts: ["Liste os produtos de pedra", "Produtos com preço acima de R$ 100"],
    roles: ["admin", "manager", "sales", "stock"],
  },
  inventory: {
    label: "Stock",
    dot: "#ef4444",
    prompts: ["Quais itens estão com estoque baixo?", "Estoque do cimento CP II"],
    roles: ["admin", "manager", "stock"],
  },
  finance: {
    label: "Financeiro",
    dot: "#22c55e",
    prompts: ["Resumo do caixa hoje", "Vendas do mês"],
    roles: ["admin", "manager"],
  },
  crm: {
    label: "CRM",
    dot: "#f97316",
    prompts: ["Clientes de Niquelândia", "Oportunidades em negociação"],
    roles: ["admin", "manager", "sales"],
  },
  security: {
    label: "Segurança",
    dot: "#ef4444",
    prompts: ["Logs de auditoria recentes", "Últimas alterações no sistema"],
    roles: ["admin"],
  },
  seo: {
    label: "SEO",
    dot: "#a855f7",
    prompts: ["Como melhorar o SEO local?"],
    roles: ["admin"],
  },
  pwa: {
    label: "PWA",
    dot: "#3b82f6",
    prompts: ["Status da PWA e cache"],
    roles: ["admin"],
  },
};

function getModulesForRole(role: UserRole | undefined): ModuleKey[] {
  return (Object.keys(ALL_MODULES) as ModuleKey[]).filter((key) =>
    ALL_MODULES[key].roles.includes(role || "user")
  );
}

function ToolBadge({ name, type }: { name: string; type: "call" | "result" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        type === "call"
          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {name}
    </span>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[#214d39] text-white rounded-br-md"
            : "bg-white/5 text-gray-100 border border-white/[0.06] rounded-bl-md"
        }`}
      >
        {!isUser ? (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-black/30">
            <Streamdown>{msg.content}</Streamdown>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        )}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
            {msg.toolCalls.map((tc, i) => (
              <ToolBadge key={i} name={tc.name} type="result" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  logistics: "Motorista",
  sales: "Vendedor",
  stock: "Estoque",
  user: "Cliente",
};

export default function AskCard({ module: initialModule }: { module?: ModuleKey }) {
  const { user } = useAuth();
  const userRole = (user?.role as UserRole) || "user";
  const availableModules = getModulesForRole(userRole);

  const defaultModule = initialModule && availableModules.includes(initialModule)
    ? initialModule
    : availableModules[0] || "customer";

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>(defaultModule);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, currentToolActivity, sendMessage, cancelStream, clearMessages } =
    useStreamingChat(activeModule, undefined, userRole);

  const mod = ALL_MODULES[activeModule];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentToolActivity]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModuleSwitch = (key: ModuleKey) => {
    if (key !== activeModule) {
      clearMessages();
      setActiveModule(key);
    }
  };

  return (
    <>
      {/* ── FAB Button ── */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-5 right-5 z-50 group flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#214d39] to-[#163528] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_rgba(33,77,57,.35)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(33,77,57,.5)] hover:scale-105 active:scale-95"
          aria-label="Abrir assistente ASK"
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Bot size={18} className="text-emerald-300" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="tracking-wide">ASK</span>
        </button>
      )}

      {/* ── Card Overlay ── */}
      {isOpen && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2.5rem)] rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,.6)] bg-[#0c1117] backdrop-blur-xl"
          style={{ animation: "slideUp 0.3s cubic-bezier(.16,1,.3,1)" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#214d39] to-[#1a3d2e] border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Bot size={18} className="text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">ASK</h3>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={10} className="text-emerald-400/70" />
                  <p className="text-[11px] text-emerald-300/70">{ROLE_LABELS[userRole]}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Minimizar"
              >
                <Minus size={15} />
              </button>
              <button
                onClick={() => { setIsOpen(false); cancelStream(); }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          {!isMinimized && (
            <>
              {/* ── Module Tabs ── */}
              <div className="flex items-center gap-1 px-3 py-2 bg-black/20 border-b border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {availableModules.map((key) => {
                  const m = ALL_MODULES[key];
                  const isActive = key === activeModule;
                  return (
                    <button
                      key={key}
                      onClick={() => handleModuleSwitch(key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.dot }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Messages ── */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#214d39] to-[#163528] mb-4 shadow-lg">
                      <Sparkles size={24} className="text-emerald-300" />
                    </div>
                    <p className="text-sm font-semibold text-white/80 mb-1">Olá! Sou o ASK</p>
                    <p className="text-xs text-white/40 mb-5 max-w-[240px]">
                      Assistente inteligente da Atua Loja. Como posso ajudar?
                    </p>
                    <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
                      {mod.prompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(p)}
                          className="text-left rounded-xl px-3.5 py-2.5 text-xs text-white/60 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:text-white/80 hover:border-white/10 transition-all duration-200"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}

                {isStreaming && currentToolActivity && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-2">
                    <Loader2 size={13} className="animate-spin text-blue-400" />
                    <span className="text-[11px] text-blue-300 font-medium">
                      {currentToolActivity.type === "tool_call" ? "Executando" : "Processando"}{" "}
                      <span className="text-blue-200 font-bold">{currentToolActivity.name}</span>
                      {currentToolActivity.detail && (
                        <span className="text-blue-400/60 ml-1">· {currentToolActivity.detail}</span>
                      )}
                    </span>
                  </div>
                )}

                {isStreaming && !currentToolActivity && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-2">
                    <Loader2 size={13} className="animate-spin text-emerald-400" />
                    <span className="text-[11px] text-white/40">ASK está pensando...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Input ── */}
              <div className="px-3 pb-3 pt-1 bg-gradient-to-t from-[#0c1117] via-[#0c1117] to-transparent">
                <div className="flex items-end gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 focus-within:border-emerald-500/40 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte ao ASK..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none max-h-20 py-1"
                  />
                  {isStreaming ? (
                    <button
                      onClick={cancelStream}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex-shrink-0"
                      aria-label="Cancelar"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2 rounded-lg bg-[#214d39] hover:bg-[#2a5e45] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      aria-label="Enviar"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
