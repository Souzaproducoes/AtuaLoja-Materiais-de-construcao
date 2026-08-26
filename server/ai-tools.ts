import { Tool } from "./_core/llm";
import {
  getPublicProducts,
  getAdminProducts,
  getInventory,
  getDashboardSummary,
  getRecentOrders,
  getCustomers,
  getActiveDeliveries,
  getDeliveryByCode,
  getCashSessions,
  getCashSessionSummary,
  getAuditLogs,
  listSuppliers,
  listPurchaseOrders,
  getOpportunities,
  getReportSalesByMonth,
  getReportOrdersByStatus,
  getReportTopProducts,
  getReportInventoryLow,
  getReportQuoteConversion,
  getReportCashSummary,
  getReportDeliveriesByStatus,
  getReportCustomersByCity,
  getCustomerActivities,
  listCustomerAddresses,
} from "./db";

export type ToolName =
  | "search_products"
  | "get_inventory"
  | "get_dashboard_summary"
  | "get_recent_orders"
  | "search_customers"
  | "get_delivery_status"
  | "get_active_deliveries"
  | "get_cash_summary"
  | "get_audit_logs"
  | "list_suppliers"
  | "list_purchase_orders"
  | "get_crm_opportunities"
  | "get_customer_activities"
  | "get_customer_addresses"
  | "get_report_sales"
  | "get_report_top_products"
  | "get_report_low_stock"
  | "get_report_quote_conversion"
  | "get_report_deliveries"
  | "get_report_customers_by_city"
  | "get_report_cash"
  | "get_report_orders_by_status";

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const tools: Array<{ def: Tool; handler: ToolHandler }> = [
  {
    def: {
      type: "function",
      function: {
        name: "search_products",
        description:
          "Busca produtos no catálogo público ou admin. Use para encontrar produtos por nome, SKU, categoria ou listar todos.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Termo de busca (nome, SKU ou categoria). Deixe vazio para listar todos.",
            },
            include_inactive: {
              type: "boolean",
              description:
                "Se true, inclui produtos inativos (apenas para admin).",
            },
          },
        },
      },
    },
    handler: async (args) => {
      const products = args.include_inactive
        ? await getAdminProducts()
        : await getPublicProducts();
      const query = String(args.query || "")
        .toLowerCase()
        .trim();
      const filtered = query
        ? products.filter(
            (p) =>
              p.name?.toLowerCase().includes(query) ||
              p.sku?.toLowerCase().includes(query) ||
              p.description?.toLowerCase().includes(query)
          )
        : products;
      if (!filtered.length) return "Nenhum produto encontrado.";
      const lines = filtered.slice(0, 15).map(
        (p) =>
          `• ${p.name} (SKU: ${p.sku}) — ${fmt(Number(p.price))}/${p.unit} — ${p.active ? "Ativo" : "Inativo"}`
      );
      return `Encontrados ${filtered.length} produto(s):\n${lines.join("\n")}${filtered.length > 15 ? `\n...e mais ${filtered.length - 15}` : ""}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_inventory",
        description:
          "Consulta estoque disponível, reservado e mínimo por produto e localização. Use para verificar disponibilidade.",
        parameters: {
          type: "object",
          properties: {
            product_id: {
              type: "number",
              description: "ID do produto para filtrar (opcional).",
            },
          },
        },
      },
    },
    handler: async (args) => {
      const inv = await getInventory();
      const filtered = args.product_id
        ? inv.filter((i) => i.productId === Number(args.product_id))
        : inv;
      if (!filtered.length) return "Nenhum registro de estoque encontrado.";
      const lines = filtered.slice(0, 20).map(
        (i) =>
          `• Produto #${i.productId} | ${i.location} | Disp: ${i.available} | Reserv: ${i.reserved} | Mín: ${i.minimum}${Number(i.available) <= Number(i.minimum) ? " ⚠️" : ""}`
      );
      return `Estoque (${filtered.length} registro(s)):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_dashboard_summary",
        description:
          "Resumo do painel: receita total, orçamentos abertos, pedidos ativos, clientes cadastrados e itens com estoque baixo.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const s = await getDashboardSummary();
      return `Resumo do painel:\n• Receita total: ${fmt(s.revenue)}\n• Orçamentos abertos: ${s.openQuotes}\n• Pedidos ativos: ${s.activeOrders}\n• Clientes: ${s.customers}\n• Estoque baixo: ${s.lowStock}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_recent_orders",
        description: "Lista os pedidos mais recentes (até 12).",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const orders = await getRecentOrders();
      if (!orders.length) return "Nenhum pedido registrado.";
      const lines = orders.map(
        (o) =>
          `• #${o.code} — ${o.status} — ${o.source} — Total: ${fmt(Number(o.total))}`
      );
      return `Pedidos recentes (${orders.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "search_customers",
        description:
          "Busca clientes cadastrados no CRM por nome, telefone ou email.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Termo de busca (nome, telefone ou email).",
            },
          },
        },
      },
    },
    handler: async (args) => {
      const customers = await getCustomers();
      const query = String(args.query || "")
        .toLowerCase()
        .trim();
      const filtered = query
        ? customers.filter(
            (c) =>
              c.name?.toLowerCase().includes(query) ||
              c.phone?.includes(query) ||
              c.email?.toLowerCase().includes(query)
          )
        : customers.slice(0, 10);
      if (!filtered.length) return "Nenhum cliente encontrado.";
      const lines = filtered
        .slice(0, 10)
        .map(
          (c) =>
            `• ${c.name} | Tel: ${c.phone} | ${c.city || "Niquelândia"} | Tipo: ${c.customerType || "individual"}`
        );
      return `Clientes (${filtered.length} encontrado(s)):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_delivery_status",
        description:
          "Consulta status de uma entrega específica pelo código (ex: ENT-123) ou ID.",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description:
                "Código da entrega (ex: ENT-123) ou ID numérico.",
            },
          },
          required: ["code"],
        },
      },
    },
    handler: async (args) => {
      const code = String(args.code || "");
      const id = Number(code.replace(/^ENT-/, ""));
      const delivery = await getDeliveryByCode(id ? String(id) : code);
      if (!delivery) return "Entrega não encontrada.";
      return `Entrega #ENT-${delivery.id}:\n• Status: ${delivery.status}\n• Endereço: ${delivery.address || "N/A"}\n• Criada: ${delivery.createdAt}\n• Concluída: ${delivery.completedAt || "pendente"}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_active_deliveries",
        description: "Lista todas as entregas ativas (em rota, saída, etc.).",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const d = await getActiveDeliveries();
      if (!d.length) return "Nenhuma entrega ativa no momento.";
      const lines = d.map(
        (x) =>
          `• ENT-${x.id} — ${x.status} — Rota #${x.routeOrder || "N/A"} — ${x.address || "N/A"}`
      );
      return `Entregas ativas (${d.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_cash_summary",
        description:
          "Resumo do caixa: sessões abertas, totais de entradas e saídas, conferência.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const sessions = await getCashSessions();
      const open = sessions.find((s) => s.status === "open");
      let summary = `Sessões de caixa: ${sessions.length} total\n`;
      if (open) {
        const s = await getCashSessionSummary(open.id);
        summary += `• Sessão aberta #${open.id}: Início ${open.openedAt}\n`;
        if (s) {
          summary += `  Entradas: ${fmt(s.inflows)} | Saídas: ${fmt(s.outflows)} | Esperado: ${fmt(s.expectedAmount)}`;
        }
      } else {
        summary += "• Nenhuma sessão aberta no momento.";
      }
      return summary;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_audit_logs",
        description:
          "Consulta logs de auditoria: ações realizadas no sistema, alterações de dados.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const logs = await getAuditLogs();
      if (!logs.length) return "Nenhum log de auditoria registrado.";
      const lines = logs.slice(0, 10).map(
        (l) =>
          `• ${l.createdAt} | User#${l.userId} | ${l.entity}#${l.entityId} | ${l.action}`
      );
      return `Logs de auditoria (${logs.length} total):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_sales",
        description:
          "Relatório de vendas por mês: quantitativo e valor total de pedidos.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportSalesByMonth();
      if (!data.length) return "Sem dados de vendas.";
      const lines = data.map(
        (d) => `• ${d.month}: ${d.count} pedidos — ${fmt(Number(d.total))}`
      );
      return `Vendas por mês:\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_top_products",
        description:
          "Top 10 produtos mais vendidos por receita e quantidade.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportTopProducts();
      if (!data.length) return "Sem dados de vendas por produto.";
      const lines = data.map(
        (d, i) =>
          `${i + 1}. ${d.description} — ${d.totalQuantity} un. — ${fmt(Number(d.totalRevenue))} (${d.orderCount} pedidos)`
      );
      return `Top produtos:\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_low_stock",
        description:
          "Produtos com estoque abaixo do mínimo configurado. Indica itens que precisam de reposição.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportInventoryLow();
      if (!data.length) return "Todos os itens estão acima do estoque mínimo.";
      const lines = data.map(
        (d) =>
          `• Produto #${d.productId} | ${d.location} | Disp: ${d.available} | Mín: ${d.minimum} | Reserv: ${d.reserved}`
      );
      return `Estoque baixo (${data.length} item(ns)):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_quote_conversion",
        description:
          "Taxa de conversão de orçamentos: total, aprovados, perdidos, expirados e pendentes.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const d = await getReportQuoteConversion();
      return `Conversão de orçamentos:\n• Total: ${d.total}\n• Aprovados: ${d.approved}\n• Pendentes: ${d.pending}\n• Perdidos: ${d.lost}\n• Expirados: ${d.expired}\n• Taxa: ${d.total ? ((d.approved / d.total) * 100).toFixed(1) : 0}%`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_deliveries",
        description: "Entregas agrupadas por status.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportDeliveriesByStatus();
      if (!data.length) return "Sem dados de entregas.";
      const lines = data.map((d) => `• ${d.status}: ${d.count}`);
      return `Entregas por status:\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_customers_by_city",
        description: "Distribuição de clientes por cidade.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportCustomersByCity();
      if (!data.length) return "Sem dados de clientes.";
      const lines = data.map((d) => `• ${d.city}: ${d.count}`);
      return `Clientes por cidade:\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_cash",
        description:
          "Resumo financeiro de caixa: totais de entradas e saídas por método de pagamento.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const d = await getReportCashSummary();
      const lines = d.byMethod.map(
        (m) =>
          `• ${m.method}: Entradas ${fmt(m.inflows)} / Saídas ${fmt(m.outflows)}`
      );
      return `Resumo de caixa:\n• Total entradas: ${fmt(d.totalInflows)}\n• Total saídas: ${fmt(d.totalOutflows)}\n• Saldo: ${fmt(d.totalInflows - d.totalOutflows)}\n${lines.length ? "\nPor método:\n" + lines.join("\n") : ""}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_orders_by_status",
        description: "Pedidos agrupados por status atual.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const data = await getReportOrdersByStatus();
      if (!data.length) return "Sem dados de pedidos.";
      const lines = data.map(
        (d) => `• ${d.status}: ${d.count} pedidos — ${fmt(Number(d.total))}`
      );
      return `Pedidos por status:\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "list_suppliers",
        description: "Lista fornecedores cadastrados.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const s = await listSuppliers();
      if (!s.length) return "Nenhum fornecedor cadastrado.";
      const lines = s.map(
        (x) =>
          `• ${x.name} | Doc: ${x.document || "N/A"} | ${x.city || "N/A"} | Tel: ${x.phone || "N/A"}`
      );
      return `Fornecedores (${s.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "list_purchase_orders",
        description: "Lista pedidos de compra a fornecedores.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const po = await listPurchaseOrders();
      if (!po.length) return "Nenhum pedido de compra registrado.";
      const lines = po.slice(0, 10).map(
        (p) =>
          `• ${p.code} — Fornecedor#${p.supplierId} — ${p.status} — ${fmt(Number(p.total || 0))}`
      );
      return `Pedidos de compra (${po.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_crm_opportunities",
        description:
          "Lista oportunidades do funil de vendas CRM com valores e etapas.",
        parameters: { type: "object", properties: {} },
      },
    },
    handler: async () => {
      const o = await getOpportunities();
      if (!o.length) return "Nenhuma oportunidade no funil.";
      const lines = o.slice(0, 10).map(
        (x) =>
          `• ${x.title} — ${x.stage} — ${x.value ? fmt(Number(x.value)) : "sem valor"} — Cliente#${x.customerId}`
      );
      return `Oportunidades (${o.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_customer_activities",
        description:
          "Histórico de atividades de atendimento (ligações, WhatsApp, emails, notas).",
        parameters: {
          type: "object",
          properties: {
            customer_id: {
              type: "number",
              description: "ID do cliente para filtrar.",
            },
          },
        },
      },
    },
    handler: async (args) => {
      const acts = await getCustomerActivities(
        args.customer_id ? Number(args.customer_id) : undefined
      );
      if (!acts.length) return "Nenhuma atividade registrada.";
      const lines = acts.slice(0, 10).map(
        (a) =>
          `• ${a.type} | ${a.summary} | ${a.createdAt}`
      );
      return `Atividades (${acts.length}):\n${lines.join("\n")}`;
    },
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_customer_addresses",
        description: "Endereços cadastrados de um cliente específico.",
        parameters: {
          type: "object",
          properties: {
            customer_id: {
              type: "number",
              description: "ID do cliente.",
            },
          },
          required: ["customer_id"],
        },
      },
    },
    handler: async (args) => {
      const addrs = await listCustomerAddresses(Number(args.customer_id));
      if (!addrs.length) return "Nenhum endereço cadastrado para este cliente.";
      const lines = addrs.map(
        (a) =>
          `• ${a.label}: ${a.address}${a.addressNumber ? ", " + a.addressNumber : ""} — ${a.city}${a.isDefault ? " (padrão)" : ""}`
      );
      return `Endereços:\n${lines.join("\n")}`;
    },
  },
];

export function getToolsForModule(module: string): Tool[] {
  const adminModules = [
    "admin",
    "catalog",
    "inventory",
    "finance",
    "crm",
    "security",
    "seo",
    "pwa",
  ];

  if (module === "customer") {
    return [
      tools.find((t) => t.def.function.name === "search_products")!.def,
      tools.find((t) => t.def.function.name === "get_delivery_status")!.def,
    ];
  }

  if (module === "delivery") {
    return [
      tools.find((t) => t.def.function.name === "get_delivery_status")!.def,
      tools.find((t) => t.def.function.name === "get_active_deliveries")!.def,
    ];
  }

  if (!adminModules.includes(module)) return [];

  const adminTools = [
    "search_products",
    "get_inventory",
    "get_dashboard_summary",
    "get_recent_orders",
    "search_customers",
    "get_delivery_status",
    "get_active_deliveries",
    "get_cash_summary",
    "get_audit_logs",
    "list_suppliers",
    "list_purchase_orders",
    "get_crm_opportunities",
    "get_customer_activities",
    "get_customer_addresses",
    "get_report_sales",
    "get_report_top_products",
    "get_report_low_stock",
    "get_report_quote_conversion",
    "get_report_deliveries",
    "get_report_customers_by_city",
    "get_report_cash",
    "get_report_orders_by_status",
  ];

  if (module === "catalog")
    return adminTools
      .filter((n) =>
        ["search_products", "get_inventory", "get_dashboard_summary"].includes(n)
      )
      .map((n) => tools.find((t) => t.def.function.name === n)!.def);

  if (module === "inventory")
    return adminTools
      .filter((n) =>
        [
          "search_products",
          "get_inventory",
          "get_report_low_stock",
          "list_purchase_orders",
        ].includes(n)
      )
      .map((n) => tools.find((t) => t.def.function.name === n)!.def);

  if (module === "finance")
    return adminTools
      .filter((n) =>
        [
          "get_dashboard_summary",
          "get_recent_orders",
          "get_cash_summary",
          "get_report_sales",
          "get_report_cash",
          "get_report_orders_by_status",
        ].includes(n)
      )
      .map((n) => tools.find((t) => t.def.function.name === n)!.def);

  if (module === "crm")
    return adminTools
      .filter((n) =>
        [
          "search_customers",
          "get_crm_opportunities",
          "get_customer_activities",
          "get_customer_addresses",
          "get_report_customers_by_city",
        ].includes(n)
      )
      .map((n) => tools.find((t) => t.def.function.name === n)!.def);

  return adminTools.map((n) => tools.find((t) => t.def.function.name === n)!.def);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const tool = tools.find((t) => t.def.function.name === name);
  if (!tool) return `Ferramenta "${name}" não encontrada.`;
  try {
    return await tool.handler(args);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `Erro ao executar "${name}": ${msg}`;
  }
}
