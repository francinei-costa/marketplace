import { delay, http, HttpResponse, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { nfts } from "./fixtures";
import { decimalToUnits, unitsToDecimal } from "./api";
import type { CartLine, Network, Nft, Order, Quote, User, Wallet } from "./types";

const DB_KEY = "kurio-mock-db-v1";
const SCENARIO_KEY = "kurio-scenario";
const PASSWORD_HASH =
  "d24ddc1f44ede4315078c90ea0e8726a3bede87eebb1cbd752e37b5cf79db0b6";

interface MockUser extends User {
  passwordHash: string;
}

interface MockDb {
  users: MockUser[];
  sessionUserId: string | null;
  carts: Record<string, CartLine[]>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  coupons: Record<string, string>;
  idempotencyPayloads: Record<string, string>;
  orderOwners: Record<string, string>;
  orders: Order[];
  version: number;
}

const userKey = () => db.sessionUserId ?? "visitante";
const currentUser = () => db.users.find((user) => user.id === db.sessionUserId);

function readDb(): MockDb {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) return JSON.parse(stored) as MockDb;
  } catch (error) {
    console.error("Não foi possível ler os dados locais da demonstração.", error);
  }
  return {
    users: [
      {
        id: "colecionadora-01",
        username: "luna",
        displayName: "Luna Reis",
        email: "luna@kurio.art",
        ens: "luna.kurio.eth",
        walletAddress: "0xA91F...E82C",
        walletAlias: "Luna principal",
        passwordHash: PASSWORD_HASH,
      },
      {
        id: "colecionador-02",
        username: "marco",
        displayName: "Marco Silva",
        email: "marco@kurio.art",
        ens: "marco.kurio.eth",
        walletAddress: "0x3B28...42A1",
        walletAlias: "Marco principal",
        passwordHash: PASSWORD_HASH,
      },
    ],
    sessionUserId: null,
    carts: { visitante: [] },
    favorites: {},
    wallets: {
      "colecionadora-01": [
        {
          id: "wallet-luna-1",
          displayName: "Reserva",
          alias: "luna.kurio.eth",
          address: "0xA91F...E82C",
          network: "Polygon",
          type: "MetaMask",
          ens: "luna.kurio.eth",
          primary: true,
        },
        {
          id: "wallet-luna-2",
          displayName: "Principal",
          alias: "Luna principal",
          address: "0x9C42...71B0",
          network: "Ethereum",
          type: "Coinbase Wallet",
          ens: "luna.eth",
          primary: false,
        },
      ],
      "colecionador-02": [],
    },
    coupons: {},
    idempotencyPayloads: {},
    orderOwners: {},
    orders: [],
    version: 1,
  };
}

let db = readDb();

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Não foi possível salvar os dados locais da demonstração.", error);
    throw error;
  }
}

function scenario() {
  return localStorage.getItem(SCENARIO_KEY) ?? "padrão";
}

function catalog(): Nft[] {
  return nfts.map((nft) =>
    scenario() === "preço-alterado" && nft.id === "emerald-ape-042"
      ? { ...nft, price: "1.39", available: 3 }
      : nft,
  );
}

function addDecimal(left: string, right: string) {
  return unitsToDecimal(decimalToUnits(left) + decimalToUnits(right));
}

function makeQuote(lines: CartLine[], coupon: string): Quote {
  const subtotalUnits = lines.reduce((sum, line) => {
    const nft = catalog().find((item) => item.id === line.nftId);
    return nft
      ? sum + decimalToUnits(nft.price) * BigInt(line.quantity)
      : sum;
  }, 0n);
  const discountUnits =
    coupon.toUpperCase() === "KURIO10" ? (subtotalUnits * 10n) / 100n : 0n;
  const networkFee = lines.length ? "0.016" : "0";
  const subtotal = unitsToDecimal(subtotalUnits);
  const discount = unitsToDecimal(discountUnits);
  return {
    subtotal,
    discount,
    networkFee,
    total: addDecimal(
      unitsToDecimal(subtotalUnits - discountUnits),
      networkFee,
    ),
    coupon: coupon.toUpperCase() === "KURIO10" ? "KURIO10" : null,
    version: db.version,
  };
}

async function maybeDelay() {
  if (scenario() === "demorado") await delay(1000);
}

function withCart() {
  return db.carts[userKey()] ?? [];
}

function requireUser() {
  const user = currentUser();
  if (!user) return HttpResponse.json({ message: "Entre na sua conta." }, { status: 401 });
  return user;
}

async function passwordDigest(password: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const socketOrigin = window.location.origin.replace(/^http/, "ws");
const socketOriginPattern = socketOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const socket = ws.link(new RegExp(`^${socketOriginPattern}(?:/socket\\.io)?/?$`));

export const handlers = [
  http.get("*/api/scenario", () =>
    HttpResponse.json({ scenario: scenario() }),
  ),
  http.post("*/api/scenario", async ({ request }) => {
    const body = (await request.json()) as { scenario: string };
    localStorage.setItem(SCENARIO_KEY, body.scenario);
    db.version += 1;
    persist();
    return HttpResponse.json({ scenario: body.scenario });
  }),
  http.post("*/api/reset", () => {
    localStorage.removeItem(DB_KEY);
    localStorage.setItem(SCENARIO_KEY, "padrão");
    db = readDb();
    persist();
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/nfts", async ({ request }) => {
    await maybeDelay();
    if (scenario() === "erro-api") {
      return HttpResponse.json(
        { message: "O catálogo está indisponível. Tente novamente." },
        { status: 503 },
      );
    }
    if (scenario() === "vazio") return HttpResponse.json({ items: [], total: 0 });
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").toLocaleLowerCase("pt-BR");
    const category = params.get("category") ?? "";
    const network = params.get("network") ?? "";
    const min = Number(params.get("min") ?? 0);
    const max = Number(params.get("max") ?? Number.MAX_SAFE_INTEGER);
    const sort = params.get("sort") ?? "recentes";
    const page = Math.max(Number(params.get("page") ?? 1), 1);
    const filtered = catalog().filter((nft) => {
      const text = `${nft.name} ${nft.collection} ${nft.artist}`.toLocaleLowerCase(
        "pt-BR",
      );
      return (
        (!q || text.includes(q)) &&
        (!category || nft.category === category) &&
        (!network || nft.network === network) &&
        Number(nft.price) >= min &&
        Number(nft.price) <= max
      );
    });
    if (sort === "menor-preço") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "maior-preço") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    const start = (page - 1) * 9;
    return HttpResponse.json({ items: filtered.slice(start, start + 9), total: filtered.length });
  }),
  http.get("*/api/nfts/:id", async ({ params }) => {
    await maybeDelay();
    const nft = catalog().find((item) => item.id === params.id);
    return nft
      ? HttpResponse.json(nft)
      : HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
  }),
  http.get("*/api/session", () => {
    if (scenario() === "sessão-expirada" && db.sessionUserId) {
      db.sessionUserId = null;
      persist();
      return HttpResponse.json({ message: "Sessão expirada." }, { status: 401 });
    }
    const user = currentUser();
    return HttpResponse.json(
      user
        ? {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            ens: user.ens,
            walletAddress: user.walletAddress,
            walletAlias: user.walletAlias,
            avatarUrl: user.avatarUrl,
          }
        : null,
    );
  }),
  http.post("*/api/auth/login", async ({ request }) => {
    const { email, password, orderId } = (await request.json()) as {
      email: string;
      password: string;
      orderId?: string;
    };
    const hash = await passwordDigest(password);
    const user = db.users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.passwordHash === hash,
    );
    if (!user) {
      return HttpResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }
    db.sessionUserId = user.id;
    if (orderId && db.orderOwners[orderId] === "visitante") {
      db.orderOwners[orderId] = user.id;
    }
    const guest = db.carts.visitante ?? [];
    const existing = db.carts[user.id] ?? [];
    for (const line of guest) {
      const match = existing.find((item) => item.nftId === line.nftId);
      if (match) match.quantity = Math.min(match.quantity + line.quantity, 9);
      else existing.push(line);
    }
    db.carts[user.id] = existing;
    db.carts.visitante = [];
    persist();
    const { passwordHash: _, ...safeUser } = user;
    return HttpResponse.json(safeUser);
  }),
  http.post("*/api/auth/register", async ({ request }) => {
    const { username, email, password, orderId } = (await request.json()) as {
      username: string;
      email: string;
      password: string;
      orderId?: string;
    };
    if (db.users.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      return HttpResponse.json(
        { message: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }
    const user: MockUser = {
      id: crypto.randomUUID(),
      username,
      displayName: username,
      email,
      ens: "",
      walletAddress: "",
      walletAlias: "",
      passwordHash: await passwordDigest(password),
    };
    db.users.push(user);
    db.sessionUserId = user.id;
    if (orderId && db.orderOwners[orderId] === "visitante") {
      db.orderOwners[orderId] = user.id;
    }
    db.carts[user.id] = db.carts.visitante ?? [];
    db.carts.visitante = [];
    db.wallets[user.id] = [];
    db.favorites[user.id] = [];
    persist();
    const { passwordHash: _, ...safeUser } = user;
    return HttpResponse.json(safeUser, { status: 201 });
  }),
  http.post("*/api/auth/logout", () => {
    const userId = db.sessionUserId;
    if (userId) db.carts[userId] = [];
    db.sessionUserId = null;
    persist();
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/favorites", () => {
    const user = requireUser();
    if (user instanceof Response) return user;
    return HttpResponse.json(db.favorites[user.id] ?? []);
  }),
  http.post("*/api/favorites", async ({ request }) => {
    const user = requireUser();
    if (user instanceof Response) return user;
    const { nftId } = (await request.json()) as { nftId: string };
    const list = db.favorites[user.id] ?? [];
    db.favorites[user.id] = list.includes(nftId)
      ? list.filter((id) => id !== nftId)
      : [...list, nftId];
    persist();
    return HttpResponse.json(db.favorites[user.id]);
  }),
  http.get("*/api/cart", () => HttpResponse.json(withCart())),
  http.post("*/api/cart", async ({ request }) => {
    const { nftId, quantity } = (await request.json()) as CartLine;
    const nft = catalog().find((item) => item.id === nftId);
    if (!nft) return HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
    const cart = withCart();
    const line = cart.find((item) => item.nftId === nftId);
    const nextQuantity = (line?.quantity ?? 0) + quantity;
    if (nextQuantity > Math.min(9, nft.available)) {
      return HttpResponse.json({ message: "Limite de edições excedido." }, { status: 409 });
    }
    if (line) line.quantity = nextQuantity;
    else cart.push({ nftId, quantity });
    db.carts[userKey()] = cart;
    persist();
    return HttpResponse.json(cart);
  }),
  http.patch("*/api/cart/:id", async ({ params, request }) => {
    const { quantity } = (await request.json()) as { quantity: number };
    const cart = withCart();
    const line = cart.find((item) => item.nftId === params.id);
    const nft = catalog().find((item) => item.id === params.id);
    if (!line || !nft) return HttpResponse.json({ message: "Item não encontrado." }, { status: 404 });
    if (quantity < 1 || quantity > Math.min(9, nft.available)) {
      return HttpResponse.json({ message: "Quantidade indisponível." }, { status: 409 });
    }
    line.quantity = quantity;
    db.carts[userKey()] = cart;
    persist();
    return HttpResponse.json(cart);
  }),
  http.delete("*/api/cart/:id", ({ params }) => {
    db.carts[userKey()] = withCart().filter((item) => item.nftId !== params.id);
    persist();
    return HttpResponse.json(db.carts[userKey()]);
  }),
  http.get("*/api/quote", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const coupon = params.has("coupon")
      ? params.get("coupon") ?? ""
      : db.coupons[userKey()] ?? "";
    if (coupon && coupon.toUpperCase() !== "KURIO10") {
      return HttpResponse.json({ message: "Cupom inválido ou expirado." }, { status: 422 });
    }
    if (params.has("coupon")) {
      db.coupons[userKey()] = coupon.toUpperCase();
      persist();
    }
    return HttpResponse.json(makeQuote(withCart(), coupon));
  }),
  http.get("*/api/profile", () => {
    const user = requireUser();
    if (user instanceof Response) return user;
    const { passwordHash: _, ...safeUser } = user;
    return HttpResponse.json(safeUser);
  }),
  http.patch("*/api/profile", async ({ request }) => {
    const user = requireUser();
    if (user instanceof Response) return user;
    const payload = (await request.json()) as Partial<User> & {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (
      payload.email &&
      db.users.some(
        (item) => item.id !== user.id && item.email.toLowerCase() === payload.email?.toLowerCase(),
      )
    ) {
      return HttpResponse.json(
        { message: "Este e-mail já pertence a outra conta." },
        { status: 409 },
      );
    }
    if (payload.newPassword) {
      if (!payload.currentPassword || (await passwordDigest(payload.currentPassword)) !== user.passwordHash) {
        return HttpResponse.json({ message: "A senha atual está incorreta." }, { status: 422 });
      }
      if (payload.newPassword !== payload.confirmPassword) {
        return HttpResponse.json({ message: "As senhas não coincidem." }, { status: 422 });
      }
      user.passwordHash = await passwordDigest(payload.newPassword);
    }
    const {
      currentPassword: _currentPassword,
      newPassword: _newPassword,
      confirmPassword: _confirmPassword,
      ...profile
    } = payload;
    Object.assign(user, profile);
    persist();
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return HttpResponse.json(safeUser);
  }),
  http.get("*/api/wallets", () => {
    const user = requireUser();
    if (user instanceof Response) return user;
    return HttpResponse.json(db.wallets[user.id] ?? []);
  }),
  http.post("*/api/wallets", async ({ request }) => {
    const user = requireUser();
    if (user instanceof Response) return user;
    const input = (await request.json()) as Omit<Wallet, "id"> & { id?: string };
    const wallets = db.wallets[user.id] ?? [];
    const wallet = { ...input, id: input.id ?? crypto.randomUUID() };
    const index = wallets.findIndex((item) => item.id === wallet.id);
    if (index >= 0) wallets[index] = wallet;
    else wallets.push(wallet);
    if (wallet.primary) {
      for (const item of wallets) {
        if (item.id !== wallet.id) item.primary = false;
      }
    }
    db.wallets[user.id] = wallets;
    persist();
    return HttpResponse.json(wallets);
  }),
  http.post("*/api/orders", async ({ request }) => {
    const user = currentUser();
    const { quoteVersion, walletId, walletAddress, walletName, cart, coupon } = (await request.json()) as {
      quoteVersion: number;
      walletId?: string;
      walletAddress?: string;
      walletName?: string;
      cart: CartLine[];
      coupon: string | null;
    };
    const key = request.headers.get("Idempotency-Key");
    if (!key) return HttpResponse.json({ message: "Chave idempotente obrigatória." }, { status: 400 });
    const previous = db.orders.find((order) => order.id === key);
    const fingerprint = JSON.stringify({
      quoteVersion,
      walletId,
      walletAddress,
      walletName,
      cart,
      coupon,
    });
    if (previous) {
      if (db.idempotencyPayloads[key] !== fingerprint) {
        return HttpResponse.json(
          { message: "A chave de idempotência já foi usada com outro conteúdo." },
          { status: 409 },
        );
      }
      return HttpResponse.json(previous);
    }
    const lines = [...withCart()];
    const wallets = user ? (db.wallets[user.id] ?? []) : [];
    const wallet = wallets.find((item) => item.id === walletId);
    if (
      !lines.length ||
      (!wallet &&
        (!walletAddress || walletAddress.trim().length < 6 || !walletName))
    ) {
      return HttpResponse.json({ message: "Revise sua carteira e seu carrinho." }, { status: 422 });
    }
    const quote = makeQuote(lines, db.coupons[userKey()] ?? "");
    if (JSON.stringify(lines) !== JSON.stringify(cart)) {
      return HttpResponse.json({ message: "O carrinho mudou. Revise seu pedido." }, { status: 409 });
    }
    const stockConflict = lines.some((line) => {
      const nft = catalog().find((item) => item.id === line.nftId);
      return !nft || line.quantity > nft.available;
    });
    if (stockConflict) {
      return HttpResponse.json({ message: "A disponibilidade mudou. Revise seu carrinho." }, { status: 409 });
    }
    if (quoteVersion !== quote.version) {
      return HttpResponse.json({ message: "A cotação mudou. Revise o total." }, { status: 409 });
    }
    if ((db.coupons[userKey()] ?? null) !== coupon) {
      return HttpResponse.json({ message: "O cupom mudou. Revise o total." }, { status: 409 });
    }
    const byId = new Map(catalog().map((nft) => [nft.id, nft]));
    const cartOwner = user?.id ?? "visitante";
    const order: Order = {
      id: key,
      transactionId: `0x${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}...E82C`,
      status:
        scenario() === "pagamento-recusado"
          ? "rejected"
          : scenario() === "timeout-pedido"
            ? "pending"
            : "confirmed",
      version: 1,
      createdAt: new Date().toISOString(),
      walletName: wallet?.type ?? walletName ?? "Carteira externa",
      items: lines.flatMap((line) => {
        const nft = byId.get(line.nftId);
        return nft ? [{ ...line, nft, unitPrice: nft.price }] : [];
      }),
      quote,
    };
    db.orders.push(order);
    db.idempotencyPayloads[key] = fingerprint;
    db.orderOwners[key] = cartOwner;
    if (order.status === "confirmed") {
      db.carts[cartOwner] = [];
    } else if (order.status === "pending") {
      setTimeout(() => {
        const pending = db.orders.find((item) => item.id === order.id);
        if (pending?.status === "pending") {
          pending.status = "confirmed";
          pending.version += 1;
          db.carts[db.orderOwners[order.id] ?? cartOwner] = [];
          persist();
        }
      }, 3500);
    }
    persist();
    if (scenario() === "timeout-pedido") return HttpResponse.error();
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get("*/api/orders/:id", ({ params }) => {
    const user = currentUser();
    const order = db.orders.find((item) => item.id === params.id);
    const owner = order ? db.orderOwners[order.id] : undefined;
    const currentOwner = user?.id ?? "visitante";
    if (!order || owner !== currentOwner) {
      return HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    }
    if (
      order?.status === "pending" &&
      scenario() === "timeout-pedido" &&
      Date.now() - new Date(order.createdAt).getTime() > 3500
    ) {
      order.status = "confirmed";
      db.carts[currentOwner] = [];
      persist();
    }
    return HttpResponse.json(order);
  }),
  socket.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection);
    let priceSent = false;
    let connectionOpen = true;
    const timer = setInterval(() => {
      if (!connectionOpen) return;
      if (scenario() === "preço-alterado" && !priceSent) {
        priceSent = true;
        const nft = catalog().find((item) => item.id === "emerald-ape-042");
        if (nft) {
          io.client.emit("nft.updated", {
            id: nft.id,
            price: nft.price,
            available: nft.available,
            version: db.version,
          });
        }
      }
      const pending = db.orders.find(
        (item) =>
          item.status === "pending" &&
          db.orderOwners[item.id] === userKey(),
      );
      if (pending) io.client.emit("order.updated", pending);
    }, 4000);
    io.client.on("order.subscribe", (_, orderId: string) => {
      const order = db.orders.find((item) => item.id === orderId);
      if (connectionOpen && order) io.client.emit("order.updated", order);
    });
    connection.client.addEventListener("close", () => {
      connectionOpen = false;
      clearInterval(timer);
    });
  }),
];

export function readScenario(): string {
  return localStorage.getItem(SCENARIO_KEY) ?? "padrão";
}

export const supportedNetworks: Network[] = ["Ethereum", "Polygon", "Solana"];
