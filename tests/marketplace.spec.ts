import { expect, test } from "@playwright/test";

async function selectScenario(
  page: import("@playwright/test").Page,
  scenario: string,
) {
  const result = await page.evaluate(async (scenario) => {
    const response = await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    return { ok: response.ok, status: response.status };
  }, scenario);
  expect(result.ok, `scenario API returned ${result.status}`).toBeTruthy();
}

async function startEmeraldCheckout(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /Emerald Ape #042/ }).first().click();
  await page.getByRole("button", { name: "Comprar", exact: true }).click();
  await page.getByRole("button", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole("textbox", { name: "Nome de exibição" }).fill("Luna Reis");
  await page.getByRole("textbox", { name: "Nome de usuário" }).fill("luna");
  await page.getByRole("textbox", { name: "Nome do perfil" }).fill("luna.kurio.eth");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("luna@kurio.art");
  await page.locator('input[name="referral"]').fill("KURIO2026");
  await page
    .getByRole("textbox", { name: "Endereço da carteira selecionada" })
    .fill("0xA91F00000000000000000000000000000000E82C");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /SEJA DONO DO FUTURO/ })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/$/);
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Início" }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.evaluate(async () => {
    await fetch("/api/reset", { method: "POST" });
  });
  await page.reload();
});

test("filtra catálogo pela busca e abre o detalhe do NFT", async ({ page }) => {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.getByRole("button", { name: "Buscar" }).click();
  }
  const search = page.getByRole("textbox", {
    name: page.viewportSize()?.width && page.viewportSize()!.width < 768
      ? "Explorar coleções"
      : "Buscar NFTs",
  });
  await search.fill("Emerald Ape");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Emerald/);
  await page.getByRole("link", { name: /Emerald Ape #042/ }).first().click();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await expect(page.getByText("1.19 ETH").first()).toBeVisible();
});

test("mantém alterações do carrinho após recarregar", async ({ page }) => {
  await page.getByRole("link", { name: /Emerald Ape #042/ }).first().click();
  await page.getByRole("button", { name: "Comprar", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "Aumentar Emerald Ape #042" }).click();
  const emeraldRow = page.locator("article").filter({ hasText: "Emerald Ape #042" }).first();
  await expect(emeraldRow.getByText("2", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("article").filter({ hasText: "Emerald Ape #042" }).first().getByText("2", { exact: true })).toBeVisible();
});

test("autentica e abre o perfil do colecionador", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "E-mail" }).fill("luna@kurio.art");
  await page.getByLabel("Senha").fill("Kurio2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/localhost:5173\/$/);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue("luna@kurio.art");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  const profileMenu = page.getByRole("navigation", { name: "Menu do perfil" });
  for (const item of [
    "Dados do perfil",
    "Carteiras",
    "Atividade",
    "Lista de interesse",
    "Ofertas",
    "Arquivos baixados",
    "Suporte",
    "Sair",
  ]) {
    await expect(profileMenu.getByText(item, { exact: true })).toBeVisible();
  }
  await profileMenu.getByRole("link", { name: "Carteiras" }).click();
  await expect(page).toHaveURL(/\/wallets$/);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toHaveCount(0);
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  } else {
    await page.getByRole("link", { name: "Perfil" }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test("conclui compra simulada e mostra o recibo", async ({ page }) => {
  await startEmeraldCheckout(page);
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 15_000 });
  const receiptLoginButton = page.getByRole("button", { name: "Ver no Etherscan" });
  await expect(receiptLoginButton).toBeVisible();
  await receiptLoginButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /SEJA DONO DO FUTURO/ }),
  ).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox", { name: "E-mail" }).fill("luna@kurio.art");
  await page.getByRole("dialog").getByRole("textbox", { name: "Senha" }).fill("Kurio2026!");
  await page
    .getByRole("dialog")
    .locator("form")
    .getByRole("button", { name: "Entrar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await page.getByRole("link", { name: "Carteiras" }).click();
  await expect(page).toHaveURL(/\/wallets$/);
  await expect(page.getByRole("heading", { name: "Carteira principal" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await page.locator('input[name="displayName"]').fill("Carteira de teste");
  await page.locator('input[name="alias"]').fill("luna.teste");
  await page.locator('input[name="address"]').fill("0x1234567890");
  await page.locator('input[name="ens"]').fill("luna.teste.eth");
  await page.locator('input[name="referralCode"]').fill("KURIO2026");
  await page.locator('input[name="email"]').fill("luna@kurio.art");
  await page.locator('input[name="ensName"]').fill("luna.teste");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Carteira salva.")).toBeVisible();
  await expect(page.locator('input[name="displayName"]')).toHaveValue(
    "Carteira de teste",
  );
});

test("exige revisão da cotação após atualização em tempo real", async ({ page }) => {
  await startEmeraldCheckout(page);
  await selectScenario(page, "preço-alterado");
  const review = page.getByRole("checkbox", { name: /O preço, disponibilidade ou taxa mudou/ });
  await expect(review).toBeVisible({ timeout: 10_000 });
  await review.check();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 15_000 });
});

test("recupera pedido após timeout pela mesma chave e preserva pedido pendente", async ({ page }) => {
  await selectScenario(page, "timeout-pedido");
  await startEmeraldCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByText(/O pedido pode estar pendente/)).toBeVisible();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 15_000 });
});

test("preserva itens no carrinho quando o pagamento é recusado", async ({ page }) => {
  await selectScenario(page, "pagamento-recusado");
  await startEmeraldCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento não confirmado" })).toBeVisible({ timeout: 15_000 });
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" }).first()).toBeVisible();
});

test("não apresenta overflow horizontal em telas estreitas", async ({ page }) => {
  if ((page.viewportSize()?.width ?? 0) >= 768) test.skip();
  const width = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
});
