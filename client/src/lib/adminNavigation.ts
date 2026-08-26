export const ADMIN_ROUTE_BY_LABEL: Record<string, string> = {
  "Clientes & CRM": "/gestao/crm",
  "Produtos & stock": "/gestao/catalogo",
  "Entregas": "/gestao/operacao",
  "Pedidos": "/gestao/operacao",
  "Orçamentos": "/gestao/crm",
  "Relatórios": "/gestao/relatorios",
  "Configurações": "/gestao/configuracoes",
};

export function getAdminRoute(label: string) {
  return ADMIN_ROUTE_BY_LABEL[label];
}

export function handleAdminMenuSelection(label: string, actions: { navigate: (path: string) => void; setActive: (label: string) => void; closeMenu: () => void; showPlaceholder: (label: string) => void }) {
  const target = getAdminRoute(label);
  if (target) {
    actions.setActive(label);
    actions.navigate(target);
    actions.closeMenu();
    return;
  }
  actions.setActive(label);
  actions.showPlaceholder(label);
}
