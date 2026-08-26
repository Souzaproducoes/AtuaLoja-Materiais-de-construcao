# Auditoria e correcções — Atua Loja OS

**Data:** 25 de agosto de 2026  
**Âmbito:** arquitectura, segurança, dependências, dados, e-commerce, ERP, CRM, entregas, PWA, UX, SEO, testes e agentes ASK.  
**Estado:** release técnico validado no sandbox; revisão e publicação controlada recomendadas.

## Resumo executivo

As correcções da auditoria foram implementadas nos fluxos críticos. O sistema mantém storefront, checkout regional, CRM, ERP, compras, stock, reservas multi-local, caixa, vendas, entregas, PWA e ASK segmentado por função. Foram acrescentados agenda de endereços com endereço predefinido associado ao orçamento, anexos de orçamento em armazenamento externo, checklist persistente por item, divergências estruturadas, resolução auditada, centro de actividade e notificações transaccionais.

A validação terminou com **52 testes aprovados**, TypeScript sem erros, build de produção aprovada e servidor Express 5 a arrancar sem os erros wildcard que existiam no log antigo. A divisão de bundle foi reforçada por rotas e vendors: o chunk de entrada ficou cerca de 94 kB, com vendors React, Radix, ícones e gráficos separados.

## Agentes ASK

| Agente | Escopo | Protecção |
|---|---|---|
| Cliente | Produtos, orçamento, compra, frete e acompanhamento | Público, sem dados internos |
| Entrega | Rota, checklist, prova e divergências | Motorista/logística |
| Administrador | Operação transversal e indicadores | Gestão |
| Catálogo | SKU, unidades, preços, imagens e publicação | Gestão |
| Stock | Reservas, movimentos, mínimos e localizações | Gestão |
| Financeiro | Vendas, pagamentos, caixa e conferência | Gestão |
| CRM | Clientes, contactos, tarefas, oportunidades e funil | Gestão |
| Segurança | Permissões, uploads, dados e auditoria defensiva | Gestão |
| SEO local | Indexabilidade e presença regional | Gestão |
| PWA | Instalação, cache, offline e actualizações | Gestão |

Todos os agentes internos usam guards por função. Os testes cobrem routing, bloqueio de anónimos, escopos e fallback seguro quando o modelo não devolve conteúdo.

## Correcções aplicadas

| Domínio | Implementação | Evidência |
|---|---|---|
| Dependências | Express 5.2.1, Recharts 3.10.1 e SDK S3 actualizado | `pnpm audit --prod --audit-level=high` sem alta/crítica; restam 24 moderadas e 5 baixas |
| Compatibilidade | Wildcards do proxy S3 e fallback SPA adaptados para Express 5 | servidor reiniciado e arranque recente limpo |
| Stock | Reservas multi-local, libertação por localização e rollback transaccional | regras puras e testes de alocação |
| Compras | Recepção parcial/completa, entrada por localização, movimento, auditoria e notificação | migrações e contracts operacionais |
| Caixa/vendas | Pagamento exige pedido existente e sessão aberta; conferência esperado/contado/diferença | helper transaccional, auditoria e tests |
| Endereços | Agenda por cliente, endereço predefinido e reutilização no cadastro/conversão | endpoints CRM e teste de contrato |
| Orçamentos | Endereço completo persistido, endereço associado à agenda do cliente, anexos PDF/PNG/JPEG/WebP em S3, limite, nome seguro e metadados; quoteId tem de existir | 52 testes de contratos, incluindo fluxo criação → quoteId → upload/listagem e rejeição de orçamento inexistente |
| Entregas | Checklist por item, quantidade carregada/entregue, falta/avaria, resolução e auditoria | UI motorista, gestão e persistência |
| Notificações | Centro lido/não lido e eventos de pedido, compra, entrega e caixa | tabela persistente e mutations tRPC |
| Performance | Importação dinâmica e manualChunks de vendors | build sem alerta de chunks superiores a 500 kB |
| Testes | Contratos de anexos, CRM, endereço e quoteId acrescentados | 12 ficheiros, 52 testes aprovados |

## Validação executada

Foram executados com sucesso `pnpm check`, `pnpm test`, `pnpm build` e `pnpm audit --prod --audit-level=high`. A suíte terminou com **12 ficheiros e 52 testes aprovados**. Também foram capturadas as rotas `/`, `/gestao`, `/gestao/crm`, `/gestao/operacao` e `/motorista` em viewport desktop, confirmando a identidade visual e os principais estados vazios.

## Riscos residuais

A auditoria de produção já não reporta vulnerabilidades alta/crítica, mas ainda apresenta **24 moderadas e 5 baixas**. Estas devem ser acompanhadas no ciclo de manutenção e reavaliadas quando os pacotes transitivos disponibilizarem actualizações compatíveis.

A instalação, actualização e operação offline da PWA precisam de confirmação num Android/iOS físico. O sandbox confirmou manifesto, service worker, app shell, prompt de instalação, contratos automatizados e responsividade visual mobile, mas não substitui o teste num telemóvel real.

Os testes automatizados são contratos, regras e integração com mocks/ambiente do projecto. Antes de operar com clientes reais, é recomendável executar staging isolado com checkout, upload, recepção, pagamento, divergência, entrega e permissões, usando dados controlados e sem credenciais de produção.

## Recomendação de release

O checkpoint deve ser revisto no painel antes de publicar. A publicação deve ser iniciada manualmente pelo botão **Publish**, seguida de smoke test do domínio publicado, confirmação de S3/Maps, validação da PWA num dispositivo real e revisão periódica das vulnerabilidades moderadas.
