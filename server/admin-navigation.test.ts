import { describe, expect, it, vi } from "vitest";
import { getAdminRoute, handleAdminMenuSelection } from "../client/src/lib/adminNavigation";

describe("admin navigation", () => {
  it("opens the integrated catalog and stock area", () => {
    expect(getAdminRoute("Produtos & stock")).toBe("/gestao/catalogo");
    const navigate = vi.fn();
    const setActive = vi.fn();
    const closeMenu = vi.fn();
    const showPlaceholder = vi.fn();
    handleAdminMenuSelection("Produtos & stock", { navigate, setActive, closeMenu, showPlaceholder });
    expect(navigate).toHaveBeenCalledWith("/gestao/catalogo");
    expect(setActive).toHaveBeenCalledWith("Produtos & stock");
    expect(closeMenu).toHaveBeenCalledOnce();
    expect(showPlaceholder).not.toHaveBeenCalled();
  });

  it("keeps other operational destinations explicit", () => {
    expect(getAdminRoute("Clientes & CRM")).toBe("/gestao/crm");
    expect(getAdminRoute("Entregas")).toBe("/gestao/operacao");
    expect(getAdminRoute("Relatórios")).toBe("/gestao/relatorios");
  });
});
