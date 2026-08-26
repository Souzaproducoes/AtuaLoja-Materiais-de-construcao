import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useStreamingChat, ChatMessage, ToolActivity } from "@/hooks/useStreamingChat";
import { Bot, Send, ShieldCheck, Loader2, Wrench, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Streamdown } from "streamdown";

type Module = "customer" | "delivery" | "admin" | "catalog" | "inventory" | "finance" | "crm" | "security" | "seo" | "pwa";
const labels: Record<Module, { name: string; description: string }> = {
  customer: { name: "Cliente", description: "Produtos, orçamento, compra, frete e acompanhamento." },
  delivery: { name: "Entrega", description: "Checklist, rota, estados e divergências da entrega." },
  admin: { name: "Administrador", description: "CRM, stock, compras, caixa e indicadores." },
  catalog: { name: "Catálogo", description: "SKU, categorias, preços, imagens e publicação." },
  inventory: { name: "Stock", description: "Reservas, movimentos, mínimos e localizações." },
  finance: { name: "Financeiro", description: "Vendas, recebimentos, caixa e conferências." },
  crm: { name: "CRM", description: "Clientes, tarefas, oportunidades e funil." },
  security: { name: "Segurança", description: "Permissões, dados, uploads e auditoria defensiva." },
  seo: { name: "SEO local", description: "Indexabilidade, conteúdo e presença regional." },
  pwa: { name: "PWA", description: "Instalação, cache, offline e actualizações." },
};

const suggestedPrompts: Record<Module, string[]> = {
  customer: ["Quais tijolos vocês têm?", "Quanto sai um saco de cimento?", "Fazem entrega em Niquelândia?"],
  delivery: ["Quais entregas estão ativas?", "Status da entrega ENT-5"],
  admin: ["Resumo do dashboard", "Quantos pedidos pendentes?"],
  catalog: ["Liste os produtos de pedra", "Produtos com preço acima de R$ 100"],
  inventory: ["Quais itens estão com estoque baixo?", "Estoque do cimento CP II"],
  finance: ["Resumo do caixa hoje", "Vendas do mês"],
  crm: ["Clientes de Niquelândia", "Oportunidades em negociação"],
  security: ["Logs de auditoria recentes", "Últimas alterações no sistema"],
  seo: ["Como melhorar o SEO local?"],
  pwa: ["Status da PWA e cache"],
};

function ToolBadge({ activity }: { activity: ToolActivity }) {
  const isCall = activity.type === "tool_call";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isCall ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
      <Wrench className="size-3" />
      {isCall ? `Consultando ${activity.name}` : `${activity.name}`}
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";
  const hasTools = message.toolCalls && message.toolCalls.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="size-8 shrink-0 mt-1 rounded-full bg-[#214d39]/10 flex items-center justify-center">
          <Bot className="size-4 text-[#214d39]" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "order-first" : ""}`}>
        <div className={`rounded-2xl px-4 py-3 ${isUser ? "bg-[#214d39] text-white" : "bg-[#fffdf8] border border-[#e5dbcc] text-[#2b302b]"}`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-[#2b302b] max-w-none">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}
        </div>
        {hasTools && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#817669] hover:text-[#9b5b35] transition-colors"
            >
              <Wrench className="size-3" />
              {message.toolCalls!.length} consulta(s) ao sistema
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                {message.toolCalls!.map((tc, i) => (
                  <ToolBadge key={i} activity={{ type: "tool_result", name: tc.name }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const { user, isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allowed = useMemo<Module[]>(() => {
    if (!user) return ["customer"];
    if (user.role === "admin" || user.role === "manager")
      return ["admin", "catalog", "inventory", "finance", "crm", "security", "seo", "pwa", "delivery", "customer"];
    if (user.role === "logistics") return ["delivery", "customer"];
    return ["customer"];
  }, [user]);

  const [module, setModule] = useState<Module>(allowed[0]);
  const [input, setInput] = useState("");

  const {
    messages,
    isStreaming,
    currentToolActivity,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useStreamingChat(module, "Utilizador na área do assistente.");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, currentToolActivity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#2b302b]">
      <header className="border-b border-[#e5dbcc] bg-[#fffdf8] px-5 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-sm font-bold text-[#214d39]">Atua Loja</Link>
          <a href="https://wa.me/5562991444852?text=Olá%20Souza%20produções,%20preciso%20de%20suporte%20na%20Atua%20Loja." target="_blank" rel="noreferrer" className="text-xs font-bold text-[#9b5b35]">Souza produções ↗</a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#214d39] text-[#e8ad6d]">
            <Bot size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9b5b35]">ASK · Assistente com tools</p>
            <h1 className="mt-2 text-4xl font-bold text-[#214d39]">Como posso ajudar?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817669]">
              O assistente agora consulta os dados reais do sistema em tempo real.
              Cada módulo tem acesso apenas às ferramentas do seu contexto.
            </p>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#ead8c1] bg-[#fff8ee] p-4 text-xs text-[#7b5a3c]">
            <ShieldCheck size={16} /> Está a usar o atendimento público.
            <button onClick={() => startLogin()} className="font-bold underline">Entrar para módulos internos</button>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {allowed.map((item) => (
            <button
              key={item}
              onClick={() => {
                setModule(item);
                clearMessages();
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                module === item
                  ? "border-[#9b5b35] bg-[#f3e4d0]"
                  : "border-[#e5dbcc] bg-[#fffdf8] hover:border-[#c7b49f]"
              }`}
            >
              <p className="text-sm font-bold text-[#214d39]">Agente {labels[item].name}</p>
              <p className="mt-1 text-xs leading-5 text-[#817669]">{labels[item].description}</p>
            </button>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-6 shadow-sm">
          <div ref={scrollRef} className="h-[500px] overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-[#817669]">
                <Bot className="size-12 opacity-20" />
                <p className="text-sm">Pergunte algo ao agente {labels[module].name}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts[module]?.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      disabled={isStreaming}
                      className="rounded-full border border-[#e5dbcc] bg-white px-3 py-1.5 text-xs text-[#214d39] hover:bg-[#f3e4d0] disabled:opacity-50 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}

            {isStreaming && currentToolActivity && (
              <div className="flex gap-3 items-start">
                <div className="size-8 shrink-0 mt-1 rounded-full bg-[#214d39]/10 flex items-center justify-center">
                  <Bot className="size-4 text-[#214d39]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#fffdf8] border border-[#e5dbcc] px-4 py-2">
                  <Loader2 className="size-3 animate-spin text-[#9b5b35]" />
                  <ToolBadge activity={currentToolActivity} />
                </div>
              </div>
            )}

            {isStreaming && !currentToolActivity && messages.length > 0 && messages[messages.length - 1].role === "user" && (
              <div className="flex gap-3 items-start">
                <div className="size-8 shrink-0 mt-1 rounded-full bg-[#214d39]/10 flex items-center justify-center">
                  <Bot className="size-4 text-[#214d39]" />
                </div>
                <div className="rounded-2xl bg-[#fffdf8] border border-[#e5dbcc] px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-[#9b5b35]" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte ao agente ${labels[module].name}...`}
              className="flex-1 rounded-2xl border border-[#e5dbcc] bg-white px-4 py-3 text-sm text-[#2b302b] placeholder-[#b5a998] focus:border-[#9b5b35] focus:outline-none resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={cancelStream}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-[#214d39] text-[#e8ad6d] hover:bg-[#1a3d2d] disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={18} />
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
