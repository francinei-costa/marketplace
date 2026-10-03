import axios from "axios";
import type { CartLine, Nft, Order, Quote, User, Wallet } from "./types";

export const http = axios.create({ baseURL: "/api", timeout: 8000 });

export interface CatalogParams {
  q?: string;
  category?: string;
  network?: string;
  sort?: string;
  page?: number;
  min?: string;
  max?: string;
}

export interface CatalogResult {
  items: Nft[];
  total: number;
}

export const api = {
  catalog: (params: CatalogParams) =>
    http.get<CatalogResult>("/nfts", { params }).then(({ data }) => data),
  nft: (id: string) =>
    http.get<Nft>(`/nfts/${id}`).then(({ data }) => data),
  session: () => http.get<User | null>("/session").then(({ data }) => data),
  login: (email: string, password: string, orderId?: string) =>
    http
      .post<User>("/auth/login", { email, password, orderId })
      .then(({ data }) => data),
  register: (
    username: string,
    email: string,
    password: string,
    orderId?: string,
  ) =>
    http
      .post<User>("/auth/register", { username, email, password, orderId })
      .then(({ data }) => data),
  logout: () => http.post("/auth/logout").then(({ data }) => data),
  favorites: () =>
    http.get<string[]>("/favorites").then(({ data }) => data),
  toggleFavorite: (nftId: string) =>
    http
      .post<string[]>("/favorites", { nftId })
      .then(({ data }) => data),
  cart: () =>
    http.get<CartLine[]>("/cart").then(({ data }) => data),
  addToCart: (nftId: string, quantity: number) =>
    http
      .post<CartLine[]>("/cart", { nftId, quantity })
      .then(({ data }) => data),
  updateCart: (nftId: string, quantity: number) =>
    http
      .patch<CartLine[]>(`/cart/${nftId}`, { quantity })
      .then(({ data }) => data),
  removeFromCart: (nftId: string) =>
    http.delete<CartLine[]>(`/cart/${nftId}`).then(({ data }) => data),
  quote: (coupon?: string) =>
    http
      .get<Quote>("/quote", {
        params: coupon === undefined ? undefined : { coupon },
      })
      .then(({ data }) => data),
  profile: () => http.get<User>("/profile").then(({ data }) => data),
  updateProfile: (
    payload: Partial<User> & {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    },
  ) =>
    http
      .patch<User>("/profile", payload)
      .then(({ data }) => data),
  wallets: () => http.get<Wallet[]>("/wallets").then(({ data }) => data),
  saveWallet: (wallet: Omit<Wallet, "id"> & { id?: string }) =>
    http
      .post<Wallet[]>("/wallets", wallet)
      .then(({ data }) => data),
  createOrder: (payload: {
    quoteVersion: number;
    walletId?: string;
    walletAddress?: string;
    walletName?: string;
    idempotencyKey: string;
    cart: CartLine[];
    coupon: string | null;
  }) =>
    http
      .post<Order>("/orders", payload, {
        headers: { "Idempotency-Key": payload.idempotencyKey },
      })
      .then(({ data }) => data),
  order: (id: string) =>
    http.get<Order>(`/orders/${id}`).then(({ data }) => data),
  scenario: () =>
    http.get<{ scenario: string }>("/scenario").then(({ data }) => data),
  setScenario: (scenario: string) =>
    http
      .post<{ scenario: string }>("/scenario", { scenario })
      .then(({ data }) => data),
  reset: () => http.post("/reset").then(({ data }) => data),
};

export function decimalToUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

export function unitsToDecimal(value: bigint, places = 3): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 10n ** 18n;
  const fraction = (absolute % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .slice(0, places)
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function multiplyEth(value: string, quantity: number): string {
  return unitsToDecimal(decimalToUnits(value) * BigInt(quantity));
}
