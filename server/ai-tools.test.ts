import { describe, expect, it, vi, beforeEach } from "vitest";
import { getToolsForModule, executeTool } from "./ai-tools";

vi.mock("./db", () => ({
  getPublicProducts: vi.fn(),
  getAdminProducts: vi.fn(),
  getInventory: vi.fn(),
  getDashboardSummary: vi.fn(),
  getRecentOrders: vi.fn(),
  getCustomers: vi.fn(),
  getActiveDeliveries: vi.fn(),
  getDeliveryByCode: vi.fn(),
  getCashSessions: vi.fn(),
  getCashSessionSummary: vi.fn(),
  getAuditLogs: vi.fn(),
  listSuppliers: vi.fn(),
  listPurchaseOrders: vi.fn(),
  getOpportunities: vi.fn(),
  getReportSalesByMonth: vi.fn(),
  getReportOrdersByStatus: vi.fn(),
  getReportTopProducts: vi.fn(),
  getReportInventoryLow: vi.fn(),
  getReportQuoteConversion: vi.fn(),
  getReportCashSummary: vi.fn(),
  getReportDeliveriesByStatus: vi.fn(),
  getReportCustomersByCity: vi.fn(),
  getCustomerActivities: vi.fn(),
  listCustomerAddresses: vi.fn(),
}));

import {
  getPublicProducts,
  getInventory,
  getDashboardSummary,
  getDeliveryByCode,
  getActiveDeliveries,
  getCustomers,
  getCashSessions,
  getAuditLogs,
  listSuppliers,
  listPurchaseOrders,
  getOpportunities,
  getReportTopProducts,
  getReportInventoryLow,
} from "./db";

describe("AI tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getToolsForModule", () => {
    it("returns product search and delivery tools for customer module", () => {
      const tools = getToolsForModule("customer");
      expect(tools.length).toBe(2);
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("search_products");
      expect(names).toContain("get_delivery_status");
    });

    it("returns delivery tools for delivery module", () => {
      const tools = getToolsForModule("delivery");
      expect(tools.length).toBe(2);
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("get_delivery_status");
      expect(names).toContain("get_active_deliveries");
    });

    it("returns all admin tools for admin module", () => {
      const tools = getToolsForModule("admin");
      expect(tools.length).toBeGreaterThan(10);
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("search_products");
      expect(names).toContain("get_inventory");
      expect(names).toContain("get_dashboard_summary");
      expect(names).toContain("get_report_sales");
    });

    it("returns subset for catalog module", () => {
      const tools = getToolsForModule("catalog");
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("search_products");
      expect(names).toContain("get_inventory");
      expect(names).not.toContain("get_audit_logs");
    });

    it("returns finance tools for finance module", () => {
      const tools = getToolsForModule("finance");
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("get_dashboard_summary");
      expect(names).toContain("get_cash_summary");
      expect(names).toContain("get_report_sales");
    });

    it("returns CRM tools for crm module", () => {
      const tools = getToolsForModule("crm");
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("search_customers");
      expect(names).toContain("get_crm_opportunities");
      expect(names).toContain("get_customer_activities");
    });

    it("returns empty array for unknown module", () => {
      const tools = getToolsForModule("unknown");
      expect(tools.length).toBe(0);
    });
  });

  describe("executeTool", () => {
    it("search_products returns products matching query", async () => {
      vi.mocked(getPublicProducts).mockResolvedValue([
        { id: 1, name: "Cimento CP II", sku: "CIM-001", price: "35.90", unit: "sc", active: 1, description: "Saco 50kg" } as any,
        { id: 2, name: "Tijolo Cerâmico", sku: "TIJ-001", price: "1.20", unit: "un", active: 1, description: "Tijolo 6 furos" } as any,
      ]);

      const result = await executeTool("search_products", { query: "cimento" });
      expect(result).toContain("Cimento CP II");
      expect(result).toContain("CIM-001");
      expect(result).not.toContain("Tijolo");
    });

    it("search_products lists all when no query", async () => {
      vi.mocked(getPublicProducts).mockResolvedValue([
        { id: 1, name: "Cimento", sku: "CIM-001", price: "35.90", unit: "sc", active: 1 } as any,
        { id: 2, name: "Tijolo", sku: "TIJ-001", price: "1.20", unit: "un", active: 1 } as any,
      ]);

      const result = await executeTool("search_products", {});
      expect(result).toContain("2 produto(s)");
    });

    it("search_products returns empty message when no results", async () => {
      vi.mocked(getPublicProducts).mockResolvedValue([]);
      const result = await executeTool("search_products", { query: "xyz" });
      expect(result).toContain("Nenhum produto encontrado");
    });

    it("get_inventory shows stock levels", async () => {
      vi.mocked(getInventory).mockResolvedValue([
        { productId: 1, location: "loja-principal", available: "100", reserved: "10", minimum: "20" } as any,
      ]);

      const result = await executeTool("get_inventory", {});
      expect(result).toContain("Produto #1");
      expect(result).toContain("Disp: 100");
      expect(result).toContain("Reserv: 10");
    });

    it("get_dashboard_summary shows formatted KPIs", async () => {
      vi.mocked(getDashboardSummary).mockResolvedValue({
        revenue: 15000,
        openQuotes: 3,
        activeOrders: 5,
        customers: 42,
        lowStock: 2,
      });

      const result = await executeTool("get_dashboard_summary", {});
      expect(result).toContain("15");
      expect(result).toContain("Orçamentos abertos: 3");
      expect(result).toContain("Clientes: 42");
      expect(result).toContain("Estoque baixo: 2");
    });

    it("get_delivery_status finds delivery by ID", async () => {
      vi.mocked(getDeliveryByCode).mockResolvedValue({
        id: 5,
        status: "in_route",
        address: "Rua Principal 123",
        createdAt: new Date(),
        completedAt: null,
      } as any);

      const result = await executeTool("get_delivery_status", { code: "5" });
      expect(result).toContain("ENT-5");
      expect(result).toContain("in_route");
      expect(result).toContain("Rua Principal 123");
    });

    it("get_delivery_status returns not found message", async () => {
      vi.mocked(getDeliveryByCode).mockResolvedValue(undefined);
      const result = await executeTool("get_delivery_status", { code: "999" });
      expect(result).toContain("não encontrada");
    });

    it("get_active_deliveries lists active deliveries", async () => {
      vi.mocked(getActiveDeliveries).mockResolvedValue([
        { id: 1, status: "in_route", routeOrder: 1, address: "Rua A" } as any,
        { id: 2, status: "departed", routeOrder: 2, address: "Rua B" } as any,
      ]);

      const result = await executeTool("get_active_deliveries", {});
      expect(result).toContain("2");
      expect(result).toContain("ENT-1");
      expect(result).toContain("ENT-2");
    });

    it("search_customers filters by name", async () => {
      vi.mocked(getCustomers).mockResolvedValue([
        { name: "João Silva", phone: "62999999999", email: "joao@test.com", city: "Niquelândia", customerType: "individual" } as any,
        { name: "Maria Santos", phone: "62988888888", email: "maria@test.com", city: "Goiania", customerType: "company" } as any,
      ]);

      const result = await executeTool("search_customers", { query: "joão" });
      expect(result).toContain("João Silva");
      expect(result).not.toContain("Maria");
    });

    it("get_cash_summary shows session info", async () => {
      vi.mocked(getCashSessions).mockResolvedValue([
        { id: 1, status: "open", openedAt: new Date() } as any,
      ]);
      const { getCashSessionSummary } = await import("./db");
      vi.mocked(getCashSessionSummary).mockResolvedValue({
        session: { id: 1, status: "open", openingAmount: "200" },
        inflows: 500,
        outflows: 50,
        expectedAmount: 650,
      } as any);

      const result = await executeTool("get_cash_summary", {});
      expect(result).toContain("Sessão aberta #1");
    });

    it("handles unknown tool name", async () => {
      const result = await executeTool("nonexistent_tool", {});
      expect(result).toContain("não encontrada");
    });

    it("handles tool execution errors gracefully", async () => {
      vi.mocked(getPublicProducts).mockRejectedValue(new Error("DB down"));
      const result = await executeTool("search_products", {});
      expect(result).toContain("Erro");
      expect(result).toContain("DB down");
    });

    it("list_suppliers shows suppliers", async () => {
      vi.mocked(listSuppliers).mockResolvedValue([
        { name: "Distribuidora ABC", document: "12345678", phone: "6299999", city: "Niquelândia" } as any,
      ]);

      const result = await executeTool("list_suppliers", {});
      expect(result).toContain("Distribuidora ABC");
    });

    it("list_purchase_orders shows PO list", async () => {
      vi.mocked(listPurchaseOrders).mockResolvedValue([
        { code: "COMP-001", supplierId: 1, status: "draft", total: "5000" } as any,
      ]);

      const result = await executeTool("list_purchase_orders", {});
      expect(result).toContain("COMP-001");
      expect(result).toContain("draft");
    });

    it("get_crm_opportunities shows pipeline", async () => {
      vi.mocked(getOpportunities).mockResolvedValue([
        { title: "Obra Hospital", stage: "proposal", value: "50000", customerId: 1 } as any,
      ]);

      const result = await executeTool("get_crm_opportunities", {});
      expect(result).toContain("Obra Hospital");
      expect(result).toContain("proposal");
    });

    it("get_report_top_products shows top sellers", async () => {
      vi.mocked(getReportTopProducts).mockResolvedValue([
        { description: "Cimento CP II", totalQuantity: "200", totalRevenue: "7180", orderCount: 15 } as any,
      ]);

      const result = await executeTool("get_report_top_products", {});
      expect(result).toContain("1. Cimento CP II");
      expect(result).toContain("200");
    });

    it("get_report_low_stock shows items below minimum", async () => {
      vi.mocked(getReportInventoryLow).mockResolvedValue([
        { productId: 1, location: "loja-principal", available: "5", minimum: "20", reserved: "0" } as any,
      ]);

      const result = await executeTool("get_report_low_stock", {});
      expect(result).toContain("Produto #1");
      expect(result).toContain("Disp: 5");
    });
  });
});
