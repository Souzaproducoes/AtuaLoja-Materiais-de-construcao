import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AssistantLauncher from "@/components/AssistantLauncher";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, BarChart3, TrendingUp, ShoppingCart, Package, Truck, DollarSign, Users, AlertTriangle, Filter } from "lucide-react";

const COLORS = ["#214d39", "#e8ad6d", "#9b5b35", "#3b654e", "#c56d45", "#dbe8d6", "#62584e", "#ead9e2", "#817669", "#376544"];

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Aguardando pgto",
  confirmed: "Confirmado",
  separating: "Em separação",
  ready: "Pronto",
  in_route: "Em rota",
  delivered: "Entregue",
  cancelled: "Cancelado",
  assigned: "Atribuído",
  checked: "Conferido",
  departed: "Saiu",
  arrived: "Chegou",
  partial: "Parcial",
  failed: "Falhou",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  store: "Loja",
  whatsapp: "WhatsApp",
  quote: "Orçamento",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  card: "Cartão",
  transfer: "Transferência",
  other: "Outro",
};

const nav = [
  { label: "Visão geral" },
  { label: "Pedidos" },
  { label: "Orçamentos" },
  { label: "Clientes & CRM" },
  { label: "Produtos & stock" },
  { label: "Entregas" },
  { label: "Relatórios" },
];

export default function Reports() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [menu, setMenu] = useState(false);

  const salesQuery = trpc.admin.reports.salesByMonth.useQuery(undefined, { retry: false });
  const statusQuery = trpc.admin.reports.ordersByStatus.useQuery(undefined, { retry: false });
  const sourceQuery = trpc.admin.reports.ordersBySource.useQuery(undefined, { retry: false });
  const topProductsQuery = trpc.admin.reports.topProducts.useQuery(undefined, { retry: false });
  const deliveryStatusQuery = trpc.admin.reports.deliveriesByStatus.useQuery(undefined, { retry: false });
  const cashQuery = trpc.admin.reports.cashSummary.useQuery(undefined, { retry: false });
  const cityQuery = trpc.admin.reports.customersByCity.useQuery(undefined, { retry: false });
  const lowStockQuery = trpc.admin.reports.inventoryLow.useQuery(undefined, { retry: false });
  const quoteQuery = trpc.admin.reports.quoteConversion.useQuery(undefined, { retry: false });

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f8f5ee] text-sm text-[#214d39]">A validar o acesso...</div>;
  if (!isAuthenticated) { navigate("/gestao"); return null; }
  if (!user || !["admin", "manager"].includes(user.role)) return <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6 text-center"><div className="max-w-sm rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-8"><h1 className="text-xl font-bold text-[#214d39]">Acesso não autorizado</h1></div></div>;

  const handle = (label: string) => {
    setMenu(false);
    if (label === "Visão geral") navigate("/gestao/admin");
    else if (label === "Clientes & CRM") navigate("/gestao/crm");
    else if (label === "Produtos & stock") navigate("/gestao/catalogo");
    else if (label === "Pedidos" || label === "Orçamentos" || label === "Entregas") navigate("/gestao/operacao");
  };

  const salesData = (salesQuery.data || []).map(s => ({ ...s, month: s.month, total: Number(s.total) }));
  const statusData = (statusQuery.data || []).map(s => ({ ...s, name: STATUS_LABELS[s.status] || s.status, count: Number(s.count), total: Number(s.total) }));
  const sourceData = (sourceQuery.data || []).map(s => ({ ...s, name: SOURCE_LABELS[s.source] || s.source, count: Number(s.count), total: Number(s.total) }));
  const topProducts = (topProductsQuery.data || []).map(p => ({ ...p, totalRevenue: Number(p.totalRevenue), totalQuantity: Number(p.totalQuantity) }));
  const deliveryData = (deliveryStatusQuery.data || []).map(s => ({ ...s, name: STATUS_LABELS[s.status] || s.status, count: Number(s.count) }));
  const cashData = cashQuery.data || { totalInflows: 0, totalOutflows: 0, byMethod: [] };
  const cityData = (cityQuery.data || []).map(c => ({ ...c, count: Number(c.count) }));
  const lowStock = lowStockQuery.data || [];
  const quoteData = quoteQuery.data || { total: 0, approved: 0, lost: 0, expired: 0, pending: 0 };

  const quotePieData = [
    { name: "Pendente", value: quoteData.pending },
    { name: "Aprovado", value: quoteData.approved },
    { name: "Perdido", value: quoteData.lost },
    { name: "Expirado", value: quoteData.expired },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#2b302b]">
      <AssistantLauncher module="admin" />
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#214d39] px-5 py-6 text-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e8ad6d] text-[#3d281b]"><span className="text-lg font-black">A</span></div>
            <div><p className="display text-2xl">Atua Loja</p><p className="text-[9px] uppercase tracking-[.2em] text-[#cbd9c8]">OS · Gestão</p></div>
          </Link>
          <button onClick={() => setMenu(false)} className="rounded-full p-2 lg:hidden"><span className="text-white">✕</span></button>
        </div>
        <div className="mt-12">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#9eb7a1]">Operação</p>
          <nav className="mt-4 space-y-1">
            {nav.map(item => (
              <button key={item.label} onClick={() => handle(item.label)} className={`flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${item.label === "Relatórios" ? "bg-[#3b654e] text-white" : "text-[#cfddcf] hover:bg-[#315b46]"}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e8ded0] bg-[#f8f5ee]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenu(true)} className="rounded-full p-2 lg:hidden"><span className="text-[#214d39]">☰</span></button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.17em] text-[#9b5b35]">Relatórios gerenciais</p>
              <h1 className="mt-1 text-xl font-bold text-[#214d39]">Indicadores da operação</h1>
            </div>
          </div>
          <Link href="/" className="hidden rounded-full border border-[#e3d8c9] bg-white px-4 py-2.5 text-xs font-bold text-[#214d39] sm:block">Ver loja ↗</Link>
        </header>

        <div className="p-5 sm:p-8 space-y-8">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={DollarSign} label="Receita total" value={`R$ ${cashData.totalInflows.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="bg-[#e3ecd9] text-[#376544]" />
            <Kpi icon={TrendingUp} label="Despesas" value={`R$ ${cashData.totalOutflows.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="bg-[#f3dfc8] text-[#9b5b35]" />
            <Kpi icon={ShoppingCart} label="Orçamentos" value={String(quoteData.total)} sub={`${quoteData.approved} aprovados`} color="bg-[#ead9e2] text-[#8d4762]" />
            <Kpi icon={Package} label="Estoque baixo" value={String(lowStock.length)} color="bg-[#f3e4d0] text-[#c56d45]" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Vendas por mês" icon={TrendingUp}>
              {salesData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={salesData}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#214d39" stopOpacity={0.2}/><stop offset="95%" stopColor="#214d39" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#817669" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#817669" }} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Area type="monotone" dataKey="total" stroke="#214d39" fill="url(#g1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem dados de vendas" />}
            </ChartCard>

            <ChartCard title="Pedidos por estado" icon={ShoppingCart}>
              {statusData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#817669" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#817669" }} />
                    <Tooltip formatter={(v) => String(v)} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem pedidos registados" />}
            </ChartCard>

            <ChartCard title="Top 10 produtos por receita" icon={Package}>
              {topProducts.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#817669" }} />
                    <YAxis dataKey="description" type="category" width={120} tick={{ fontSize: 10, fill: "#817669" }} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem itens de pedidos" />}
            </ChartCard>

            <ChartCard title="Conversão de orçamentos" icon={Filter}>
              {quotePieData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={quotePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {quotePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem orçamentos registados" />}
            </ChartCard>

            <ChartCard title="Entregas por estado" icon={Truck}>
              {deliveryData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={deliveryData} cx="50%" cy="50%" outerRadius={95} paddingAngle={2} dataKey="count" label={({ name, ...rest }: any) => `${name}: ${rest.count || rest.payload?.count || 0}`}>
                      {deliveryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem entregas registadas" />}
            </ChartCard>

            <ChartCard title="Clientes por cidade" icon={Users}>
              {cityData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={cityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis dataKey="city" tick={{ fontSize: 10, fill: "#817669" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#817669" }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem clientes registados" />}
            </ChartCard>

            <ChartCard title="Pedidos por canal de origem" icon={BarChart3}>
              {sourceData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sourceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#817669" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#817669" }} />
                    <Tooltip formatter={(v, key) => key === "total" ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : v} />
                    <Legend />
                    <Bar dataKey="count" fill="#214d39" radius={[6, 6, 0, 0]} name="Quantidade" />
                    <Bar dataKey="total" fill="#e8ad6d" radius={[6, 6, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem pedidos registados" />}
            </ChartCard>

            <ChartCard title="Caixa por método de pagamento" icon={DollarSign}>
              {cashData.byMethod.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={cashData.byMethod.map(m => ({ ...m, name: METHOD_LABELS[m.method] || m.method }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dbcc" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#817669" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#817669" }} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Bar dataKey="inflows" fill="#376544" radius={[6, 6, 0, 0]} name="Entradas" />
                    <Bar dataKey="outflows" fill="#9b5b35" radius={[6, 6, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Sem movimentos de caixa" />}
            </ChartCard>
          </div>

          {lowStock.length > 0 && (
            <div className="rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-6 shadow-[0_10px_30px_rgba(50,40,25,.04)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3e4d0] text-[#c56d45]"><AlertTriangle size={18} /></div>
                <h3 className="text-sm font-bold text-[#214d39]">Produtos com estoque abaixo do mínimo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-[#e5dbcc] text-[#817669]"><th className="pb-2 pr-4">Produto ID</th><th className="pb-2 pr-4">Localização</th><th className="pb-2 pr-4 text-right">Disponível</th><th className="pb-2 pr-4 text-right">Mínimo</th><th className="pb-2 text-right">Reservado</th></tr></thead>
                  <tbody>{lowStock.map((item, i) => (
                    <tr key={i} className="border-b border-[#f0e9dc]"><td className="py-2 pr-4 font-medium">{item.productId}</td><td className="py-2 pr-4">{item.location}</td><td className="py-2 pr-4 text-right text-[#c56d45] font-bold">{Number(item.available).toFixed(1)}</td><td className="py-2 pr-4 text-right">{Number(item.minimum).toFixed(1)}</td><td className="py-2 text-right">{Number(item.reserved).toFixed(1)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, color }: { icon: typeof DollarSign; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(50,40,25,.04)]">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></div>
      <p className="mt-4 text-xs font-semibold text-[#817669]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#214d39]">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#9b5b35]">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(50,40,25,.04)]">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[#9b5b35]" />
        <h3 className="text-sm font-bold text-[#214d39]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-[280px] items-center justify-center text-xs text-[#817669]">{text}</div>;
}
