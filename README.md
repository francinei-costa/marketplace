# Kurio

Demonstração responsiva de um marketplace de NFTs. Os dados, pagamentos e carteiras são simulados; a aplicação não se conecta a uma blockchain nem a serviços de pagamento reais.

## Rodar localmente

Requer Node.js 22.12 ou superior e npm.

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`. O MSW é iniciado por padrão e intercepta as chamadas REST e WebSocket. Não há variáveis de ambiente obrigatórias. `VITE_ENABLE_MOCKS=false` desativa o mock; sem uma API compatível, os fluxos não estarão disponíveis.

## Contas de demonstração

| E-mail | Senha |
| --- | --- |
| luna@kurio.art | Kurio2026! |
| marco@kurio.art | Kurio2026! |

Use somente dados fictícios. As senhas são armazenadas como hash no mock local; isso não representa um serviço de autenticação de produção.

## Cenários de falha

Os cenários são configurados pela API simulada. Para selecionar um, abra o Console do navegador e execute:

```js
await fetch("/api/scenario", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scenario: "erro-api" }),
});
location.reload();
```

Substitua `erro-api` por um dos valores abaixo:

| Cenário | O que demonstra |
| --- | --- |
| `padrão` | Fluxo normal, com pedido confirmado |
| `demorado` | Atraso nas consultas de catálogo e detalhe |
| `erro-api` | Erro 503 no catálogo |
| `vazio` | Catálogo sem resultados |
| `preço-alterado` | Mudança de preço/disponibilidade de Emerald Ape #042 via Socket.IO |
| `pagamento-recusado` | Pedido recusado; itens permanecem no carrinho |
| `timeout-pedido` | Timeout ao criar pedido, seguido de recuperação pela mesma chave |
| `sessão-expirada` | A próxima consulta a uma sessão existente retorna 401 |

Para restaurar a base local e voltar ao cenário padrão, execute no Console:

```js
await fetch("/api/reset", { method: "POST" });
location.reload();
```

O reset limpa usuários registrados, sessão, carrinhos, favoritos, carteiras, cupons e pedidos locais e restaura as contas fictícias iniciais.

### Reproduzir alguns fluxos

- **Catálogo indisponível:** selecione `erro-api`, recarregue o início e observe a mensagem de erro. Volte ao cenário `padrão` e recarregue para recuperar o catálogo.
- **Carregamento lento:** selecione `demorado` e recarregue o início ou um detalhe para ver os skeletons.
- **Preço atualizado:** selecione `preço-alterado`, adicione Emerald Ape #042 ao carrinho e avance até o pagamento. A mudança recebida pelo socket exige revisar a cotação.
- **Pagamento recusado:** selecione `pagamento-recusado`, inicie uma compra e confirme; o pedido é recusado e os itens ficam no carrinho.
- **Timeout:** selecione `timeout-pedido` e confirme uma compra. A primeira resposta falha; tente novamente para recuperar o mesmo pedido pela chave de idempotência.
- **Sessão expirada:** entre na conta, selecione `sessão-expirada` e navegue para uma tela que consulta a sessão, como Perfil. A sessão simulada será encerrada.

Depois de cada cenário, selecione `padrão` ou faça o reset para evitar que ele afete o próximo fluxo.

## Comandos

| Ação | Comando |
| --- | --- |
| Desenvolvimento | `npm run dev` |
| Build | `npm run build` |
| Verificar tipos | `npm run typecheck` |
| Lint | `npm run lint` |
| Preview do build | `npm run preview` |
| Testes E2E | `npm run test:e2e` |
| Um teste E2E | `npx playwright test tests/marketplace.spec.ts -g "mantém alterações do carrinho"` |
| Auditoria Lighthouse | `npm run audit:lighthouse` |

O Playwright inicia o servidor de desenvolvimento. Os relatórios ficam em `playwright-report/`; traces e screenshots são guardados em falhas. A auditoria Lighthouse salva relatórios HTML/JSON e medianas em `reports/lighthouse/`.

## Documentação técnica

Os endpoints simulados, eventos, sessão, carrinho, cache e limitações estão descritos em [ARCHITECTURE.md](./ARCHITECTURE.md).
