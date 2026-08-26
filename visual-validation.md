# Validação visual

Em 25 de Agosto de 2026 foram verificadas as rotas `/`, `/gestao/operacao`, `/gestao/crm` e `/motorista` em viewport desktop de 1280x720. A loja pública apresentou a identidade terracota/verde/areia, CTA de orçamento e prompt de instalação PWA. A operação apresentou as abas CRM, Vendas, Stock, Compras e Caixa. O CRM apresentou carteira de clientes, contacto, actividades/tarefas, oportunidades e o cartão de conversão com cadastro, endereço e frete. O módulo motorista apresentou rota, estado de localização, paragens, conferência e fechamento.

A rota `/gestao/operacoes` não é uma rota válida; a rota implementada é `/gestao/operacao`. O mapa apresentou o fallback visual esperado quando a API de mapas não está disponível na captura, sem erro de interface. A instalação real em dispositivo móvel e o modo offline continuam a exigir teste manual fora do sandbox.

Foram também capturadas `/` e `/motorista` em viewport mobile de 375x812. A loja reorganiza a navegação, mantém o CTA e mostra o prompt de instalação sem corte relevante; o motorista reorganiza os cartões de distância, carga e janela e mantém localização, mapa e ASK acessíveis. Isto valida responsividade visual no sandbox. A instalação e o offline num Android/iOS físico continuam a exigir confirmação do cliente.

O servidor foi reiniciado depois da migração para Express 5 e da correcção dos wildcards do proxy S3/fallback SPA. O log recente mostra arranque em `http://localhost:3000/`; PathErrors anteriores pertencem a execuções anteriores à correcção.
