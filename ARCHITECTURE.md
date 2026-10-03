# Arquitetura

## Organização

- `src/App.tsx` monta a árvore do TanStack Router e o layout global.
- `src/routes/` concentra a definição das rotas e os fluxos de catálogo, detalhe do NFT, checkout, autenticação, pedido, perfil e carteiras.
- `src/components/` agrupa as telas e os controles visuais por funcionalidade; elementos visuais de autenticação e checkout ficam separados das definições de rota.
- `src/hooks/use-marketplace-realtime.ts` mantém a conexão Socket.IO de atualizações de NFTs e reconcilia os dados no cache do TanStack Query.
- `src/api.ts` concentra o cliente Axios e as funções REST tipadas.
- `src/types.ts` define os contratos usados entre API, mocks e interface.
- `src/mocks.ts` implementa os handlers REST e o servidor WebSocket simulado com MSW.
- `src/mocks/browser.ts` cria o worker. `src/main.tsx` o inicia antes de importar a aplicação.
- `src/components/` contém as telas e os controles visuais; `src/index.css` define tokens e estilos globais.

React e TypeScript são usados na interface e nos contratos; TanStack Router trata as rotas e parâmetros de busca; TanStack Query mantém os dados remotos; Axios envia as chamadas. Tailwind CSS aplica os estilos e os controles em `src/components/ui/` seguem o padrão shadcn/ui, com Radix UI no seletor. O Playwright cobre os fluxos E2E configurados para Chromium desktop e mobile. O Lighthouse é executado pelo script `scripts/audit-lighthouse.mjs`.

## Contratos REST simulados

Base: `/api`. As chamadas passam pelo Axios e são interceptadas pelo MSW no navegador. Os valores ETH são enviados como strings decimais; o cálculo usa unidades inteiras de 18 casas.

| Recurso | Operação | Entrada principal | Resultado |
| --- | --- | --- | --- |
| Sessão | `GET /session` | — | Usuário autenticado ou `null`; sessão expirada retorna 401 |
| Conta | `POST /auth/login` | `{ email, password, orderId? }` | Usuário sem hash de senha |
| Conta | `POST /auth/register` | `{ username, email, password, orderId? }` | Usuário criado; e-mail duplicado retorna 409 |
| Conta | `POST /auth/logout` | — | `{ ok: true }`; encerra sessão |
| NFTs | `GET /nfts` | `q`, `category`, `network`, `sort`, `page`, `min`, `max` | `{ items, total }`, até 9 itens por página |
| NFT | `GET /nfts/:id` | Identificador na rota | NFT ou 404 |
| Favoritos | `GET /favorites` | Sessão exigida | Lista de identificadores |
| Favoritos | `POST /favorites` | `{ nftId }` | Alterna o NFT na lista e retorna a lista atualizada |
| Carrinho | `GET /cart` | Sessão ou chave de visitante | Lista `{ nftId, quantity }` |
| Carrinho | `POST /cart` | `{ nftId, quantity }` | Adiciona quantidade; indisponibilidade retorna 409 |
| Carrinho | `PATCH /cart/:id` | `{ quantity }` | Atualiza quantidade; item ausente retorna 404 |
| Carrinho | `DELETE /cart/:id` | Identificador na rota | Lista atualizada |
| Cotação | `GET /quote?coupon=...` | Cupom opcional | Subtotal, desconto, taxa, total, cupom válido e versão; cupom inválido retorna 422 |
| Pedido | `POST /orders` | `quoteVersion`, `walletId?`, `walletAddress?`, `walletName?`, `cart`, `coupon`; cabeçalho `Idempotency-Key` | Snapshot do pedido; conflitos de carrinho, disponibilidade, cotação ou chave retornam 409 |
| Pedido | `GET /orders/:id` | Identificador na rota | Snapshot pertencente ao usuário atual ou 404 |
| Perfil | `GET /profile` | Sessão exigida | Dados do perfil, sem senha |
| Perfil | `PATCH /profile` | Campos de perfil e, opcionalmente, senha atual/nova/confirmação | Perfil atualizado; e-mail duplicado retorna 409; senha inválida retorna 422 |
| Carteiras | `GET /wallets` | Sessão exigida | Carteiras do usuário |
| Carteiras | `POST /wallets` | Campos de `Wallet`; `id` opcional | Cria carteira ou atualiza a carteira com o mesmo ID |
| Mock | `GET /scenario` | — | Identificador do cenário atual |
| Mock | `POST /scenario` | `{ scenario }` | Seleciona cenário |
| Mock | `POST /reset` | — | Restaura a base de demonstração |

Os mocks usam respostas HTTP para validação, autenticação, recurso inexistente, conflito e falha de serviço, conforme cada operação. A chave idempotente é armazenada junto ao conteúdo da tentativa: repetir a chave com o mesmo conteúdo recupera o pedido; reutilizá-la com conteúdo diferente retorna 409. O recibo registra os NFTs, preços e cotação do momento da compra.

## Sessão e dados locais

O MSW guarda a base da demonstração em `localStorage` (`kurio-mock-db-v1`), incluindo usuários, `sessionUserId`, carrinhos, favoritos, carteiras, cupons e pedidos. A sessão é recuperada por `GET /session`. As senhas fictícias são comparadas por SHA-256 e não são retornadas pela API; esse mecanismo é apenas uma simulação local, não autenticação adequada para produção.

Login e cadastro associam a sessão ao usuário. No login, os itens de visitante são mesclados ao carrinho da conta, respeitando o limite simulado, e a lista de visitante é esvaziada. O logout encerra a sessão e limpa o carrinho da conta, sem transferir itens privados para visitante. As mutations de logout também limpam o cache do TanStack Query.

Favoritos, perfil e carteiras exigem autenticação. A tela de checkout também permite finalizar como visitante no fluxo atual, embora o enunciado descreva checkout autenticado; esse comportamento é uma divergência conhecida. Perfil e Carteiras redirecionam para login quando não há sessão. O cenário `sessão-expirada` faz a próxima consulta de sessão autenticada retornar 401.

O controle `POST /reset` remove a base persistida, redefine o cenário para `padrão` e cria novamente os usuários e dados iniciais. A seleção de cenário e os passos para reproduzir falhas estão no README.

## Carrinho e pedidos

O carrinho contém identificadores de NFT e quantidades inteiras, separado entre usuário autenticado e visitante. O mock valida a existência do NFT e a disponibilidade ao adicionar ou alterar itens. Após login, as linhas do carrinho visitante são incorporadas à conta; no logout, o carrinho da conta é apagado conforme o comportamento implementado.

A cotação é calculada no mock a partir do carrinho, do cupom e do catálogo atual. `KURIO10` aplica 10% de desconto; a taxa simulada é `0.016 ETH` quando há itens. Antes de criar pedido, o mock confere carrinho, estoque, versão da cotação e cupom. Pedido recusado preserva os itens; pedido confirmado limpa o carrinho. Pedido pendente é atualizado para confirmado na simulação e a tela acompanha o estado.

## Cache e atualizações

As opções globais do TanStack Query em `src/query-client.ts` são:

- consultas ficam frescas por 20 segundos;
- consultas podem ser repetidas uma vez após erro;
- não há refetch automático ao focar a janela;
- mutations não são repetidas automaticamente.

Dados privados são associados ao identificador do usuário nas chaves quando necessário, por exemplo `["wallets", userId]` e `["favorites", userId]`. Após mutations, as consultas afetadas são invalidadas. Favoritos usam atualização otimista: a consulta é cancelada, o cache é atualizado antes da resposta e o valor anterior é restaurado em caso de falha.

## Socket.IO e reconciliação REST

`socket.io-client` conecta por WebSocket ao caminho `/socket.io`, com reconexão habilitada. O `@mswjs/socket.io-binding` adapta a conexão interceptada pelo MSW aos eventos do mock; não é um servidor Socket.IO completo e não reproduz todos os recursos de rooms, namespaces ou broadcast.

| Evento | Dados | Tratamento no cliente |
| --- | --- | --- |
| `nft.updated` | `{ id, price, available, version }` | Ignora versão igual ou antiga, atualiza catálogo/detalhe em cache e invalida a cotação |
| `order.updated` | Snapshot `Order`, com `id`, `status` e `version` | A tela do pedido aplica somente versões mais recentes do pedido que está aberto e invalida o carrinho |

Na tela do pedido, cada conexão emite `order.subscribe` com o identificador do pedido. Enquanto estiver pendente, a tela consulta `GET /orders/:id` a cada 1,5 segundo; isso permite recuperar o resultado depois de recarregar ou perder um evento. O mock também emite atualizações do pedido pendente. Ao desmontar a tela, listeners e conexão são encerrados.

O hook `useMarketplaceRealtime` ignora versões antigas, atualiza o catálogo e o detalhe no cache e invalida a cotação. A reconexão do socket está habilitada, mas não há reconciliação REST geral de todos os NFTs ativos após reconectar; a reconciliação do pedido é feita pela consulta periódica descrita acima. A demonstração de alteração de preço envia o evento pelo caminho do cliente Socket.IO interceptado pelo MSW.

## Interface, UX e limites

As cores e a tipografia seguem os tokens em `src/index.css`; assets do projeto ficam em `public/artworks/` e `src/assets/`. Perfil e Carteiras não exibem o rodapé. A confirmação do pedido é uma rota isolada. O fluxo de autenticação pós-compra aparece como modal no desktop e tela isolada no mobile. As páginas Perfil e Carteiras empilham menu e conteúdo em telas estreitas.

Os itens de menu editorial/ajuda e algumas ações do rodapé são apenas visuais ou desativados, conforme o escopo. Login social e recuperação de senha não fazem operações reais. Carteiras, conexão, pagamento, transação e links de exploração são simulados; não há conexão com extensão, blockchain, indexador ou gateway.

Há diferenças intencionais de comportamento em relação a telas estáticas do Figma: campos de formulário podem exibir validação, carregamento, erro e confirmação; o número do carrinho, os dados de perfil e as carteiras dependem do estado local; as telas sem frame mobile específico usam layout responsivo. Não há uma lista automatizada de diferenças pixel a pixel, então a conferência visual final deve ser feita contra os frames fornecidos.

## Testes e Lighthouse

O Playwright está configurado para Chromium em 1440 × 900 e 390 × 844. A suíte atual cobre fluxos principais de catálogo, carrinho, conta, compra, pedido pendente/recusado, alteração via Socket.IO e overflow mobile. Ainda não cobre todos os cenários enumerados no desafio e não há baselines de screenshots configuradas.

Os relatórios existentes em `reports/lighthouse/` registram três medições por rota e perfil para início e detalhe. As medianas estão resumidas abaixo:

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | Início | 41 | 100 | 100 | 100 | 3,67 s | 0 | 1.524 ms |
| Desktop | Detalhe | 38 | 100 | 100 | 100 | 5,72 s | 0 | 1.891 ms |
| Mobile | Início | 68 | 100 | 100 | 100 | 4,43 s | 0 | 589 ms |
| Mobile | Detalhe | 68 | 100 | 100 | 100 | 4,72 s | 0 | 594 ms |

As pontuações de performance registradas ficam abaixo da meta de 90. Os relatórios e o resumo em `reports/lighthouse/` contêm os dados por execução. A auditoria exige build e preview locais; consulte o README para executar novamente.

O deploy público não está configurado neste repositório. O app deve ser publicado em um provedor com fallback de SPA para que o acesso direto e o refresh das rotas funcionem.
