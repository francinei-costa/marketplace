import {
  createRoute,
  defaultStringifySearch,
  Link,
  useNavigate,
  type AnyRoute,
} from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { categories } from "../fixtures";
import type { CatalogSearch } from "../types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NftCard } from "../components/catalog/nft-card";
import { PriceRangeFilter } from "../components/catalog/price-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../components/ui/select";
import { PostPurchaseAuth } from "../components/order/order-page";

function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "",
    network: typeof search.network === "string" ? search.network : "",
    sort: typeof search.sort === "string" ? search.sort : "recentes",
    page: Math.max(Number(search.page) || 1, 1),
    min: typeof search.min === "string" ? search.min : "0.02",
    max: typeof search.max === "string" ? search.max : "12.3",
    authMode:
      search.authMode === "login" || search.authMode === "register"
        ? search.authMode
        : "",
    next: typeof search.next === "string" ? search.next : "",
  };
}

export function stringifySearch(search: Record<string, unknown>) {
  const normalized = { ...search };
  const defaults: Record<keyof CatalogSearch, string | number> = {
    q: "",
    category: "",
    network: "",
    sort: "recentes",
    page: 1,
    min: "0.02",
    max: "12.3",
    authMode: "",
    next: "",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (normalized[key] === value) delete normalized[key];
  }

  return defaultStringifySearch(normalized);
}

export function createCatalogRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  function CatalogPage() {
    const search = catalogRoute.useSearch();
    const navigate = useNavigate({ from: "/" });
    const authOrderId = search.next.match(/^\/order\/([a-zA-Z0-9-]+)$/)?.[1];
    const catalogFilters = {
      q: search.q,
      category: search.category,
      network: search.network,
      sort: search.sort,
      page: search.page,
      min: search.min,
      max: search.max,
    };
    const [searchText, setSearchText] = useState(search.q);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [activeCatalogTab, setActiveCatalogTab] = useState("todos");

    useEffect(() => {
      if (window.location.search) {
        void navigate({
          search: (current: CatalogSearch) => current,
          replace: true,
        });
      }
    }, [navigate]);
    const { data, isLoading, isError, refetch } = useQuery({
      queryKey: ["catalog", catalogFilters],
      queryFn: () => api.catalog(catalogFilters),
      placeholderData: keepPreviousData,
    });
    const { data: user } = useQuery({
      queryKey: ["session"],
      queryFn: api.session,
    });
    const { data: favorites = [] } = useQuery({
      queryKey: ["favorites", user?.id],
      queryFn: api.favorites,
      enabled: Boolean(user),
    });

    function updateSearch(updates: Partial<CatalogSearch>) {
      void navigate({
        search: (previous: CatalogSearch) => ({
          ...previous,
          ...updates,
          page: updates.page ?? 1,
        }),
      });
    }

    function submitSearch(event: FormEvent) {
      event.preventDefault();
      updateSearch({ q: searchText });
    }

    return (
      <>
        <section className="mx-auto max-w-300 px-5 pt-6 md:px-0 md:pt-9">
          <form onSubmit={submitSearch} className="mb-4 flex gap-2 md:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 size-4 text-sand" />
              <Input
                className="rounded-xl border-0 bg-panel pl-10"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Explorar coleções"
                aria-label="Explorar coleções"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="default"
              aria-label="Filtros"
              aria-expanded={showMobileFilters}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <SlidersHorizontal size={18} />
            </Button>
          </form>
          {showMobileFilters && (
            <div className="mb-4 rounded-2xl border border-line bg-panel p-4 lg:hidden">
              <h2 className="mb-3 font-bold">Coleções</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant="ghost"
                    className={`min-h-0 h-auto rounded-full border px-3 py-2 text-xs font-normal hover:bg-transparent ${search.category === category ? "border-amber text-amber" : "border-line text-sand"}`}
                    onClick={() =>
                      updateSearch({
                        category: search.category === category ? "" : category,
                      })
                    }
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <h2 className="mb-3 mt-4 font-bold">Rede</h2>
              <div className="flex flex-wrap gap-2">
                {["Ethereum", "Polygon", "Solana"].map((network) => (
                  <Button
                    key={network}
                    type="button"
                    variant="ghost"
                    className={`min-h-0 h-auto rounded-full border px-3 py-2 text-xs font-normal hover:bg-transparent ${search.network === network ? "border-amber text-amber" : "border-line text-sand"}`}
                    onClick={() =>
                      updateSearch({
                        network: search.network === network ? "" : network,
                      })
                    }
                  >
                    {network}
                  </Button>
                ))}
              </div>
              <div className="mt-5">
                <h2 className="mb-3 font-bold">Faixa de preço</h2>
                <PriceRangeFilter
                  key={`${search.min}:${search.max}`}
                  min={search.min}
                  max={search.max}
                  onApply={(min, max) => updateSearch({ min, max })}
                />
              </div>
            </div>
          )}
          <div className="relative grid min-h-72.5 items-center gap-7 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_68%_46%,#59331b_0%,#241510_44%,#21140f_100%)] px-5 py-8 md:min-h-112.5 md:grid-cols-2 md:items-start md:rounded-none md:bg-none md:py-0 md:pl-10 md:pr-0">
            <div className="relative z-10 max-w-[68%] md:max-w-[566px] md:pt-[45px]">
              <p className="mb-3 text-sm text-sand md:mb-7 md:text-white">
                Bem-vindo à Kurio
              </p>
              <h1 className="relative max-w-xl text-2xl font-black leading-tight md:-top-[13px] md:max-w-[560px] md:text-[43px] md:font-bold md:leading-[1.6] md:tracking-[-0.02em]">
                SEJA DONO DO FUTURO DA ARTE DIGITAL
              </h1>
              <p className="mt-3 max-w-lg text-xs leading-5 text-sand md:-mt-[11px] md:max-w-[550px] md:text-[14px] md:leading-6">
                Descubra NFTs selecionados de criadores emergentes e
                consagrados. Colecione arte digital rara, apoie artistas e tenha
                uma parte da cultura da internet.
              </p>
              <Button
                asChild
                className="mt-5 md:mt-[35px] md:h-[40px] md:min-h-[40px] md:w-[140px] text-[14px]"
              >
                <a href="#catalogo">EXPLORAR</a>
              </Button>
            </div>
            <div className="relative hidden justify-self-end md:block">
              <img
                src="/artworks/emerald.png"
                alt="Emerald Ape, destaque da coleção Kurio"
                fetchPriority="high"
                className="aspect-square w-[min(34vw,450px)] translate-x-[2px] translate-y-px rounded-[24px] object-cover"
              />
            </div>
            <img
              src="/artworks/emerald.png"
              alt="Emerald Ape em destaque"
              className="absolute right-4 top-8 w-[38%] rounded-2xl md:hidden"
            />
            <img
              src="/artworks/sage.png"
              alt=""
              className="absolute right-[29%] top-[132px] z-10 w-[20%] rounded-xl border-4 border-panel md:hidden"
            />
            <div
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 md:hidden"
              aria-hidden="true"
            >
              <i className="size-2 rounded-full bg-copper" />
              <i className="size-2 rounded-full bg-copper/50" />
              <i className="size-2 rounded-full bg-copper/50" />
            </div>
            <div
              className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 gap-2 md:flex"
              aria-hidden="true"
            >
              <i className="size-2 rounded-full bg-copper" />
              <i className="size-2 rounded-full bg-copper/50" />
              <i className="size-2 rounded-full bg-copper/50" />
            </div>
          </div>
        </section>

        <section
          id="catalogo"
          className="mx-auto mt-9 grid max-w-300 gap-7 px-5 lg:mt-[96px] lg:grid-cols-[310px_1fr] lg:gap-[48px] lg:px-0"
        >
          <aside className="hidden space-y-4 lg:block">
            <div id="catalog-filters" className="rounded-sm bg-panel p-5">
              <h2 className="mb-4 font-bold">Coleções</h2>
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={category}
                    onClick={() =>
                      updateSearch({
                        category: search.category === category ? "" : category,
                      })
                    }
                    className={`min-h-0 h-auto w-full justify-between rounded-none p-0 text-left text-xs font-normal hover:bg-transparent ${search.category === category ? "text-amber" : "text-sand hover:text-white"}`}
                  >
                    {category}
                    <span>({[33, 12, 65, 39, 23, 17, 19, 13, 18][index]})</span>
                  </Button>
                ))}
              </div>
              <div className="my-6 border-t border-line pt-5">
                <h2 className="mb-3 font-bold">Faixa de preço</h2>
                <PriceRangeFilter
                  min={search.min}
                  max={search.max}
                  onApply={(min, max) => updateSearch({ min, max })}
                />
              </div>
              <div className="border-t border-line pt-5">
                <h2 className="mb-3 font-bold">Rede</h2>
                {["Ethereum", "Polygon", "Solana"].map((network, index) => (
                  <Button
                    key={network}
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      updateSearch({
                        network: search.network === network ? "" : network,
                      })
                    }
                    className={`mb-3 min-h-0 h-auto w-full justify-between rounded-none p-0 text-left text-xs font-normal hover:bg-transparent ${search.network === network ? "text-amber" : "text-sand"}`}
                  >
                    {network}
                    <span>({[119, 78, 86][index]})</span>
                  </Button>
                ))}
              </div>
            </div>
            <section className="bg-panel p-3 text-center">
              <h2 className="mb-2 text-sm font-bold text-amber">
                NFT EM DESTAQUE
              </h2>
              <p className="mb-2 text-xs font-bold text-white">
                OFERTA LIMITADA
              </p>
              <Link
                to="/nft/sage-nomad-009"
                aria-label="Ver NFT em destaque: Sage Nomad #009"
              >
                <img
                  src="/artworks/sage.png"
                  alt="Sage Nomad #009 em destaque"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              </Link>
            </section>
          </aside>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-4 overflow-x-auto text-sm">
                {[
                  ["todos", "Todos os NFTs"],
                  ["recentes", "Novos lançamentos"],
                  ["maior-preço", "Em alta"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setActiveCatalogTab(value);
                      updateSearch({
                        sort: value === "todos" ? "recentes" : value,
                      });
                    }}
                    className={`min-h-0 h-auto rounded-none px-0 pb-2 pt-0 font-normal hover:bg-transparent ${activeCatalogTab === value ? "border-b-2 border-copper font-bold text-amber" : "text-white"}`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <Select
                  value={search.sort}
                  onValueChange={(sort) => updateSearch({ sort })}
                >
                  <SelectTrigger
                    aria-label="Ordenar NFTs"
                    className="h-9 w-[300px] whitespace-nowrap border-0 bg-transparent text-sm text-white"
                  >
                    <span>
                      Ordenar por:{" "}
                      {search.sort === "menor-preço"
                        ? "Menor preço"
                        : search.sort === "maior-preço"
                          ? "Maior preço"
                          : "Listados recentemente"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">
                      Listados recentemente
                    </SelectItem>
                    <SelectItem value="menor-preço">Menor preço</SelectItem>
                    <SelectItem value="maior-preço">Maior preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isError ? (
              <div className="rounded-md border border-line bg-panel p-8 text-center">
                <p className="mb-4 text-sand">
                  Não foi possível carregar o catálogo.
                </p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                <h2 className="sr-only">Resultados do catálogo</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:gap-x-6">
                  {isLoading
                    ? Array.from({ length: 9 }, (_, index) => (
                        <div
                          key={index}
                          className="shimmer aspect-square rounded-xl"
                        />
                      ))
                    : data?.items.map((nft) => (
                        <NftCard
                          key={nft.id}
                          nft={nft}
                          favorite={favorites.includes(nft.id)}
                        />
                      ))}
                </div>
              </>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <div className="rounded-md border border-line bg-panel px-6 py-12 text-center text-sand">
                Nenhum NFT encontrado com estes filtros.
              </div>
            )}
            {data && data.total > 9 && (
              <nav
                className="mt-8 flex justify-end gap-[6px]"
                aria-label="Paginação do catálogo"
              >
                {Array.from(
                  { length: Math.ceil(data.total / 9) },
                  (_, index) => {
                    const page = index + 1;
                    return (
                      <Button
                        key={page}
                        size="icon"
                        variant={search.page === page ? "default" : "outline"}
                        aria-label={`Página ${page}`}
                        aria-current={search.page === page ? "page" : undefined}
                        className="size-[26px] min-h-0 rounded-[3px] p-0 text-xs"
                        onClick={() => updateSearch({ page })}
                      >
                        {page}
                      </Button>
                    );
                  },
                )}
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Próxima página"
                  disabled={search.page * 9 >= data.total}
                  className="size-[26px] min-h-0 rounded-[3px] p-0"
                  onClick={() => updateSearch({ page: search.page + 1 })}
                >
                  <ChevronRight size={15} />
                </Button>
              </nav>
            )}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:col-span-2">
            <PromoCard
              image="/artworks/emerald.png"
              title="Lançamentos gênesis de edição limitada"
            />
            <PromoCard
              image="/artworks/neon.png"
              title="Arte digital selecionada e muito mais"
            />
          </div>
        </section>
        <section className="mx-auto mt-16 max-w-300 px-5">
          <h2 className="mb-2 text-center text-2xl font-bold">
            Diário da Cunhagem
          </h2>
          <p className="mb-7 text-center text-sm text-sand">
            Histórias, guias e insights para colecionadores sobre o universo da
            propriedade digital.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              "Como funciona a propriedade de NFTs",
              "10 artistas digitais para acompanhar",
              "Raridade, atributos e procedência",
              "Como proteger sua carteira",
            ].map((title, index) => (
              <article
                key={title}
                className="overflow-hidden rounded-sm bg-panel"
              >
                <img
                  src={
                    [
                      "/artworks/neon.png",
                      "/artworks/emerald.png",
                      "/artworks/sage.png",
                      "/artworks/golden-beat.png",
                    ][index]
                  }
                  alt=""
                  className="aspect-[1.35] w-full object-cover"
                />
                <div className="p-3">
                  <p className="mb-2 text-[10px] text-muted">
                    15 de setembro　|　Leitura de 3 min
                  </p>
                  <h3 className="text-xs font-bold leading-5">{title}</h3>
                  <span className="mt-2 block text-xs text-amber">
                    Ler mais →
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        {search.authMode && (
          <PostPurchaseAuth
            orderId={authOrderId}
            mode={search.authMode}
            onModeChange={(authMode) =>
              void navigate({
                search: (previous: CatalogSearch) => ({
                  ...previous,
                  authMode,
                }),
              })
            }
            onClose={() =>
              void navigate({
                search: (previous: CatalogSearch) => ({
                  ...previous,
                  authMode: "",
                  next: "",
                }),
              })
            }
            onAuthenticated={() => {
              void navigate({ to: "/profile" });
            }}
          />
        )}
      </>
    );
  }

  function PromoCard({ image, title }: { image: string; title: string }) {
    return (
      <div className="flex h-[168px] items-center gap-3 overflow-hidden rounded-md bg-panel">
        <img
          src={image}
          alt=""
          className="h-full w-1/2 shrink-0 rounded-xl object-cover"
        />
        <div className="flex-1 p-3 text-right">
          <h3 className="mb-2 text-xs font-bold leading-4">{title}</h3>
          <p className="mb-1 text-[10px] leading-4 text-sand">
            Explore novos artistas, coleções verificadas e obras digitais que
            definem a cultura.
          </p>
          <Button className="mt-5 md:mt-[35px] md:h-[40px] md:min-h-[40px] md:w-[140px] font-bold text-[14px]">
            <Link to="/">Explorar →</Link>
          </Button>
        </div>
      </div>
    );
  }

  const catalogRoute = createRoute({
    getParentRoute,
    path: "/",
    validateSearch: validateCatalogSearch,
    component: CatalogPage,
  });
  return catalogRoute;
}
