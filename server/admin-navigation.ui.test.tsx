/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigate, toastInfo } = vi.hoisted(() => ({ navigate: vi.fn(), toastInfo: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Administrador", role: "admin" }, loading: false, isAuthenticated: true }),
}));

vi.mock("@/components/AssistantLauncher", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { info: toastInfo, success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/gestao", navigate],
}));

const { query, mutation } = vi.hoisted(() => ({
  query: (data: unknown = []) => ({ data, refetch: vi.fn(), isLoading: false }),
  mutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      summary: { useQuery: () => query({ revenue: 0, openQuotes: 0, activeOrders: 0, customers: 0 }) },
      recentOrders: { useQuery: () => query([]) },
      activeDeliveries: { useQuery: () => query([]) },
      auditLogs: { useQuery: () => query([]) },
      notifications: { useQuery: () => query([]) },
      markNotificationRead: { useMutation: mutation },
      divergences: { list: { useQuery: () => query([]) }, resolve: { useMutation: mutation } },
    },
    auth: { localLogin: { useMutation: mutation } },
  },
}));

import Admin from "../client/src/pages/Admin";

describe("Admin navigation UI", () => {
  beforeEach(() => {
    navigate.mockClear();
    toastInfo.mockClear();
  });

  it("navigates Products & stock to the integrated page without placeholder toast", () => {
    render(<Admin />);
    fireEvent.click(screen.getByRole("button", { name: /Produtos & stock/i }));
    expect(navigate).toHaveBeenCalledWith("/gestao/catalogo");
    expect(toastInfo).not.toHaveBeenCalled();
  });
});
