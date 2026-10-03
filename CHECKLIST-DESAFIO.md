# Checklist de verificação do desafio

Status baseado na leitura do código, configurações, testes e documentação.  
**[x]** evidência encontrada · **[~]** parcial ou ainda sem validação suficiente · **[ ]** não encontrado.  
Um item marcado **[x]** confirma que há implementação/configuração; não significa que os testes foram executados nesta revisão.

## 1. Stack obrigatória

- [x] React e TypeScript — `src/`.
- [x] TanStack Router — rotas em `src/App.tsx`, `src/routes/`.
- [x] TanStack Query — consultas, mutations e cache usados nas telas.
- [x] Axios — cliente REST em `src/api.ts`.
- [x] MSW — handlers REST e WebSocket em `src/mocks.ts`; inicialização em `src/main.tsx`.
- [x] Socket.IO — cliente na aplicação e binding de mock com `@mswjs/socket.io-binding`.
- [x] Tailwind CSS e componentes no padrão shadcn/ui — `src/index.css`, `src/components/ui/`.
- [x] Playwright — configuração desktop/mobile em `playwright.config.ts`.
- [x] Lighthouse — configuração em `lighthouse.config.json` e auditoria em `scripts/audit-lighthouse.mjs`.

## 2. Telas e fluxos

- [x] Início: destaque, catálogo, busca, filtros, ordenação, paginação e acesso a detalhes.
- [x] Detalhes do NFT: imagens, dados, edição/quantidade, favorito e compra.
- [x] Carrinho: alterar quantidade, remover itens, aplicar cupom e consultar resumo.
- [x] Pagamento: formulário, carteira/rede, revisão e envio do pedido simulado.
- [x] Confirmação: estados do pedido e recibo do pedido simulado.
- [x] Login: validação e retorno ao fluxo por rota/search.
- [x] Cadastro: formulário e validação.
- [x] Perfil: edição de dados, avatar e senha.
- [x] Carteiras: formulário e suporte de criação/edição na API simulada.
- [~] O checkout permite continuar como visitante; o desafio especifica que checkout exige autenticação. Há uma divergência de fluxo a decidir/conferir com o requisito.
- [~] Confirmar visualmente cada tela contra os frames Figma em desktop e mobile; esta revisão não fez uma comparação completa de todas as telas.
- [~] Perfil, carteiras e confirmação funcionam em mobile sem frames específicos, mas falta validá-los nos viewports exigidos de 390, 768 e 1440 px.

## 3. Catálogo, detalhe e carrinho

- [x] Parâmetros do catálogo são refletidos na URL; a API simulada recebe busca, filtros, ordenação e página.
- [x] Há paginação e reinicialização da página ao alterar filtros.
- [~] Restauração pelo histórico e combinações de filtros existem como requisito, mas não têm cobertura E2E localizada.
- [x] Detalhe por identificador e estado para NFT inexistente estão ligados à API simulada.
- [x] Favoritos usam atualização otimista com rollback e invalidação posterior.
- [x] Carrinho persiste no mock local e o login mescla o carrinho de visitante.
- [x] Quantidades, remoção, cupom, cotação e preço/disponibilidade entram nos fluxos simulados.
- [~] A precisão decimal é tratada em unidades inteiras, mas o conjunto de testes para limites e arredondamentos não cobre todos os cenários descritos.

## 4. Pagamento, pedido e sessão

- [x] API simulada valida cotação, disponibilidade e cupom antes de criar pedido.
- [x] Pedido usa chave de idempotência; repetição com conteúdo diferente retorna conflito.
- [x] Há cenários de pedido pendente, confirmado, recusado e timeout recuperável.
- [x] Login/logout, dois usuários de demonstração, sessão local e retorno a fluxos estão implementados.
- [x] Logout limpa o cache privado; as chaves de dados privados incluem usuário quando aplicável.
- [~] O isolamento entre usuários, expiração em diferentes etapas do fluxo e preservação do contexto após expiração precisam de cobertura E2E mais ampla.
- [~] Há simulação de escolha de carteira/rede, mas o requisito de conexão, recusa e desconexão não está integralmente coberto pelos testes.

## 5. API e estado remoto

- [x] Contratos TypeScript e chamadas Axios tipadas estão em `src/types.ts` e `src/api.ts`.
- [x] Recursos de sessão, NFTs, favoritos, carrinho, cotação, pedidos, perfil e carteiras possuem handlers simulados.
- [x] Há respostas simuladas para sessão inválida, falta de autenticação, recurso inexistente, conflito, validação e falha 503.
- [x] Estados de carregamento, vazio, erro e sucesso aparecem em diferentes fluxos.
- [~] Cancelamento/descarte de respostas obsoletas e recuperação genérica de todas as falhas não têm evidência de cobertura completa.
- [~] A documentação lista endpoints e decisões principais, mas não detalha todos os esquemas de request/response e códigos de erro.

## 6. MSW e cenários

- [x] MSW intercepta REST e WebSocket; o estado simulado persiste localmente.
- [x] Existe reset para um estado conhecido e seleção de cenários na interface.
- [x] Há cenários de catálogo vazio/indisponível, latência alta, sessão expirada, alteração de preço, pagamento recusado e pedido pendente.
- [x] As fixtures incluem mais de um usuário e variedade de NFTs.
- [~] O cenário de latência encontrado aplica atraso fixo; latência variável e respostas REST deliberadamente fora de ordem não foram localizadas.
- [~] Timeout e falhas HTTP são simulados, mas indisponibilidade de conexão e recuperação de cada cenário precisam de testes dedicados.
- [x] O mock de Socket.IO e suas limitações estão descritos em `ARCHITECTURE.md`.

## 7. Tempo real

- [x] `nft.updated` atualiza dados de catálogo/detalhe e invalida a cotação.
- [x] `order.updated` atualiza o pedido acompanhado.
- [x] Há versão nos eventos/recursos e descarte de eventos antigos no listener de NFT.
- [x] Existe cenário para mudança de preço durante checkout e exigência de revisão.
- [~] Duplicatas e eventos antigos de pedido, desconexão, retomada após reconexão e isolamento de eventos entre sessões não têm cobertura suficiente localizada.
- [~] A reconciliação de todos os recursos ativos com REST após reconexão deve ser confirmada; a arquitetura documenta recuperação de pedido pendente, não todos os casos.

## 8. Interface, responsividade e acessibilidade

- [x] Existem estilos responsivos, assets locais, shimmer e respeito a `prefers-reduced-motion`.
- [x] Há foco visível, labels e mensagens associadas em diversos formulários.
- [x] Há semântica e nomes acessíveis para controles principais.
- [~] Navegação por teclado, foco em diálogos/drawers, contraste e zoom precisam de verificação sistemática.
- [~] Overflow horizontal foi conferido em algumas telas/larguras, mas não em todas as rotas e larguras do desafio.
- [~] Frames e baselines visuais ainda precisam ser comparados/versionados para todas as telas exigidas.

## 9. Playwright

- [x] Playwright inicia o Vite e está configurado para Chromium desktop (1440 × 900) e mobile (390 × 844).
- [x] O arquivo `tests/marketplace.spec.ts` contém oito testes E2E e reseta o mock antes de cada teste.
- [x] Há relatório HTML e trace/screenshot em falha configurados.
- [~] A suíte cobre alguns fluxos principais, mas não todos os 12 grupos de cenários exigidos no desafio.
- [~] Cobertura encontrada: busca/detalhe básico, persistência do carrinho, perfil/logout, compra/recibo, preço via Socket.IO, pedido pendente, recusa e overflow mobile.
- [ ] Não foram encontrados baselines versionados nem assertions de regressão visual com screenshot.
- [ ] Não foram encontrados testes E2E dedicados para filtros combinados/histórico, NFT inexistente, cadastro/conflitos, favoritos com rollback, cupom inválido, senha/avatar, teclado/foco, eventos duplicados/antigos ou recuperação de falhas após retry.
- [~] Os testes não foram executados nesta revisão, conforme a decisão de deixar a execução para a validação final.

## 10. Lighthouse

- [x] Configuração define início e detalhe, perfis desktop/mobile e três execuções por combinação.
- [x] Há 24 relatórios HTML/JSON e `summary.json` em `reports/lighthouse/`.
- [x] `ARCHITECTURE.md` registra medianas, ambiente, LCP, CLS, TBT e análise.
- [x] Acessibilidade (100), boas práticas (100) e SEO (100) reportados atingem as metas descritas.
- [ ] Performance não atinge a meta de 90 nas medições documentadas (desktop: 41/38; mobile: 68/68).

## 11. Documentação e entrega

- [x] `README.md` descreve instalação, variáveis, credenciais fictícias, cenários, reset e comandos.
- [x] `ARCHITECTURE.md` documenta stack, contratos em nível geral, sessão, carrinho, cache, eventos e limitações.
- [x] Existem comandos para dev, build, typecheck, lint, Playwright e Lighthouse.
- [x] Lockfile e assets locais estão presentes.
- [~] A documentação dos contratos e do protocolo de eventos pode ser aprofundada para cobrir todos os payloads, erros e limitações exigidos.
- [ ] Deploy público e URL da aplicação não foram encontrados; `ARCHITECTURE.md` indica que dependem da hospedagem escolhida.
- [~] Não foi localizada configuração de deploy versionada; validar também refresh/acesso direto às rotas no ambiente publicado.

## Pendências prioritárias

1. Decidir e alinhar o requisito de autenticação no checkout com o fluxo atual de visitante.
2. Completar a cobertura E2E dos grupos exigidos, inclusive validação e edição de carteiras.
3. Criar baselines versionados para regressão visual.
4. Completar testes de reconexão, eventos duplicados/antigos e isolamento por sessão.
5. Melhorar performance para atingir Lighthouse ≥ 90.
6. Publicar a aplicação e documentar a URL/deploy.
7. Fazer a conferência visual e responsiva de todas as telas nos viewports 390, 768 e 1440 px.
