import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api } from "../../api";
import type { CatalogSearch } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: user, isPending: sessionPending } = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
  });
  const { data: cart = [] } = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isProfilePage = pathname === "/profile" || pathname === "/wallets";
  const isHome = pathname === "/" || isProfilePage;
  const isMarket = pathname.startsWith("/nft/") || pathname === "/cart" || pathname === "/checkout";

  function search(event: FormEvent) {
    event.preventDefault();
    void navigate({
      to: "/",
      search: (previous: CatalogSearch) => ({ ...previous, q: searchText, page: 1 }),
    });
    setSearchOpen(false);
  }

  return (
    <header className="mx-auto  h-[58px] max-w-300 border-b border-line/70">
      <div className="flex items-center justify-between gap-6 px-5 md:px-0">
        <Link
          to="/"
          className="text-base font-black tracking-[0.12em] text-white"
        >
          KURIO
        </Link>
        <nav
          className="hidden items-center gap-9 md:flex"
          aria-label="Navegação principal"
        >
          <Link
            to="/"
            className={`nav-link ${isHome ? "nav-active" : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            Início
          </Link>
          <Link
            to="/"
            hash="catalogo"
            className={`nav-link ${isMarket ? "nav-active" : ""}`}
            aria-current={isMarket ? "page" : undefined}
          >
            Mercado
          </Link>
          <a href="#criadores" className="nav-link">
            Criadores
          </a>
          <a href="#rodape" className="nav-link">
            Aprenda
          </a>
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <div className="flex items-center">
            {searchOpen && (
              <form onSubmit={search} className="flex items-center">
                <label className="sr-only" htmlFor="header-search">
                  Buscar NFTs
                </label>
                <Input
                  ref={searchInput}
                  id="header-search"
                  aria-label="Buscar NFTs"
                  className="h-9 w-40 border-transparent bg-transparent"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar"
                />
              </form>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Buscar"
              aria-expanded={searchOpen}
              className="size-11 shrink-0 rounded-none text-white"
              onClick={() => {
                setSearchOpen((open) => !open);
                if (!searchOpen)
                  requestAnimationFrame(() => searchInput.current?.focus());
              }}
            >
              <Search size={19} />
            </Button>
          </div>
          <Link
            to="/cart"
            className="relative text-white"
            aria-label={`Carrinho, ${cart.length} itens`}
          >
            <ShoppingCart size={21} />
            {cart.length > 0 && (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-copper text-[10px] font-bold text-ink">
                {cart.length}
              </span>
            )}
          </Link>
          {isProfilePage || (!sessionPending && !user) ? (
            <button
              type="button"
              className="header-button"
              onClick={() =>
                void navigate({
                  to: "/",
                  search: (previous: CatalogSearch) => ({
                    ...previous,
                    authMode: "login",
                    next: "/",
                  }),
                })
              }
            >
              <img
                src="/icons/login.svg"
                alt=""
                aria-hidden="true"
                width="18"
                height="18"
              />
              Entrar
            </button>
          ) : null}
        </div>
        <Link
          to="/cart"
          className="relative text-white md:hidden"
          aria-label={`Abrir carrinho, ${cart.length} itens`}
        >
          <ShoppingCart size={21} />
          {cart.length > 0 && (
            <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-copper text-[10px] font-bold text-ink">
              {cart.length}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
