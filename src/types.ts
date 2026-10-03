export type Network = "Ethereum" | "Polygon" | "Solana";

export type CatalogSearch = {
  q: string;
  category: string;
  network: string;
  sort: string;
  page: number;
  min: string;
  max: string;
  authMode: "" | "login" | "register";
  next: string;
};

export interface Nft {
  id: string;
  name: string;
  tokenId: string;
  collection: string;
  artist: string;
  image: string;
  price: string;
  network: Network;
  category: string;
  edition: number;
  available: number;
  rating: string;
  description: string;
  attributes: string[];
}

export interface CartLine {
  nftId: string;
  quantity: number;
}

export interface Quote {
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  coupon: string | null;
  version: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  ens: string;
  walletAddress: string;
  walletAlias?: string;
  avatarUrl?: string;
}

export interface Wallet {
  id: string;
  displayName: string;
  alias: string;
  address: string;
  network: Network;
  type: string;
  ens: string;
  primary: boolean;
  secondaryEns?: string;
  email?: string;
  referralCode?: string;
  ensName?: string;
}

export interface Order {
  id: string;
  transactionId: string;
  status: "pending" | "confirmed" | "rejected";
  version: number;
  createdAt: string;
  walletName: string;
  items: Array<CartLine & { nft: Nft; unitPrice: string }>;
  quote: Quote;
}

export type Scenario =
  | "padrão"
  | "demorado"
  | "erro-api"
  | "vazio"
  | "preço-alterado"
  | "pagamento-recusado"
  | "timeout-pedido"
  | "sessão-expirada";
