import {
  createRoute,
  Link,
  useNavigate,
  type AnyRoute,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Mail, Minus, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/button";
import { NftCard } from "../components/catalog/nft-card";
import { ErrorPage } from "../components/layout/error-page";
import { errorMessage } from "../lib/error-message";

export function createDetailRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  function DetailPage() {
    const { nftId } = detailRoute.useParams();
    const navigate = useNavigate();
    const client = useQueryClient();
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState("Detalhes do NFT");
    const [message, setMessage] = useState("");
    const [imageZoomOpen, setImageZoomOpen] = useState(false);
    const {
      data: nft,
      isLoading,
      isError,
    } = useQuery({
      queryKey: ["nft", nftId],
      queryFn: () => api.nft(nftId),
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
    const favorite = favorites.includes(nftId);
    const favoriteMutation = useMutation({
      mutationFn: () => api.toggleFavorite(nftId),
      onMutate: async () => {
        await client.cancelQueries({ queryKey: ["favorites", user?.id] });
        const previous =
          client.getQueryData<string[]>(["favorites", user?.id]) ?? [];
        client.setQueryData(
          ["favorites", user?.id],
          favorite
            ? previous.filter((id) => id !== nftId)
            : [...previous, nftId],
        );
        return { previous };
      },
      onError: (error, _, context) => {
        client.setQueryData(["favorites", user?.id], context?.previous ?? []);
        if (error instanceof Error && "response" in error) {
          void navigate({ to: "/login", search: { next: `/nft/${nftId}` } });
        }
      },
      onSettled: () =>
        void client.invalidateQueries({ queryKey: ["favorites"] }),
    });

    async function addToCart(goToCheckout: boolean) {
      if (!nft) return;
      try {
        await api.addToCart(nft.id, quantity);
        await client.invalidateQueries({ queryKey: ["cart"] });
        await client.invalidateQueries({ queryKey: ["quote"] });
        setMessage(`${nft.name} foi adicionado ao carrinho.`);
        if (goToCheckout) void navigate({ to: "/cart" });
      } catch (error) {
        setMessage(errorMessage(error));
      }
    }

    if (isLoading) return <DetailLoader />;
    if (isError || !nft)
      return <ErrorPage message="Este NFT não foi encontrado." />;

    return (
      <section className="mx-auto max-w-300 py-7 md:py-8">
        <p className="mb-2 text-sm font-bold">
          <Link to="/" className="hover:text-amber">
            Início
          </Link>
          <span className="px-2">/</span>
          <Link to="/" hash="catalogo" className="hover:text-amber">
            Mercado
          </Link>
        </p>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex gap-3">
            <div className="hidden flex-col gap-3 sm:flex">
              {Array.from({ length: 4 }, (_, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="ghost"
                  aria-label={`Ver imagem ${index + 1}`}
                  className={`size-[72px] min-h-0 overflow-hidden rounded-lg border p-0 hover:bg-transparent ${index === 0 ? "border-copper" : "border-transparent"}`}
                >
                  <img
                    src={nft.image}
                    alt=""
                    className="size-full object-cover"
                  />
                </Button>
              ))}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-panel">
              <img
                src={nft.image}
                alt={`Arte digital ${nft.name}`}
                fetchPriority="high"
                className="aspect-square w-full object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 size-7 min-h-0 rounded-full bg-ink/75 p-0 text-white hover:bg-ink"
                onClick={() => setImageZoomOpen(true)}
                aria-label="Ampliar imagem"
              >
                <Search size={19} />
              </Button>
            </div>
          </div>
          <div className="pt-1">
            <h1 className="text-xl font-bold md:text-2xl">{nft.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <p className="text-xl font-bold text-amber">{nft.price} ETH</p>
              <p className="text-xs text-sand">
                <span className="text-amber">★★★★★</span>{" "}
                <span className="text-white">
                  19 avaliações de colecionadores
                </span>
              </p>
            </div>
            <h2 className="mt-3 text-xs font-bold">Sobre este NFT:</h2>
            <p className="mt-2 text-xs leading-5 text-sand">
              {nft.description}
            </p>
            <h2 className="mt-3 text-xs font-bold">Edição:</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
              {[1, 10, 50].map((edition) => (
                <span
                  key={edition}
                  className={`rounded-full border px-2 py-1 ${edition === nft.edition ? "border-amber text-amber" : "border-line text-sand"}`}
                >
                  1/{edition}
                </span>
              ))}
              <span className="rounded-full border border-line px-2 py-1 text-sand">
                ABERTA
              </span>
            </div>
            <div className="mt-3 hidden flex-wrap items-center justify-between gap-3 md:flex md:h-[49.5px] md:w-[554px] md:flex-nowrap md:gap-0">
              <div className="flex items-center gap-3" aria-label="Quantidade">
                <Button
                  size="icon"
                  className="h-[49.5px] w-[33px] min-h-0  rounded-[33px]"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={16} />
                </Button>
                <span aria-live="polite">{quantity}</span>
                <Button
                  size="icon"
                  className="h-[49.5px] w-[33px] min-h-0  rounded-[33px] p-0"
                  onClick={() =>
                    setQuantity(Math.min(nft.available, quantity + 1))
                  }
                  aria-label="Aumentar quantidade"
                  disabled={quantity >= nft.available}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="h-[40px] min-h-0 min-w-[130px] rounded-md px-4 py-0 font-bold text-[14px] leading-[20px] tracking-normal uppercase"
                  onClick={() => void addToCart(true)}
                >
                  Comprar
                </Button>
                <Button
                  variant="outline"
                  className="h-[40px] min-h-0 gap-1.5 rounded-md px-2.5 py-0 text-xs font-normal"
                  onClick={() => favoriteMutation.mutate()}
                  aria-label={
                    favorite
                      ? "Remover dos favoritos"
                      : "Adicionar aos favoritos"
                  }
                >
                  <Heart size={16} fill={favorite ? "currentColor" : "none"} />
                  Favoritar
                </Button>
              </div>
            </div>
            <dl className="mt-3 space-y-2 text-xs text-sand">
              <div>
                <dt className="sr-only">ID do token</dt>
                <dd>ID do token: #{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="sr-only">Coleção</dt>
                <dd>Coleção: {nft.collection}</dd>
              </div>
              <div>
                <dt className="sr-only">Atributos</dt>
                <dd>Atributos: {nft.attributes.join(", ")}</dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-white">
              <span className="mr-1">Compartilhar este NFT:</span>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Compartilhar no LinkedIn"
                className="text-white hover:text-amber"
              >
                in
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(nft.name)}`}
                aria-label="Compartilhar por e-mail"
                className="text-sand hover:text-amber"
              >
                <Mail size={16} />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(nft.name)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Compartilhar no Twitter"
                className="text-white hover:text-amber"
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.932 4.932 0 0 0 2.163-2.723 9.99 9.99 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.944 13.944 0 0 1 1.64 3.162a4.916 4.916 0 0 0 1.523 6.557 4.903 4.903 0 0 1-2.229-.616v.062a4.918 4.918 0 0 0 3.946 4.818 4.936 4.936 0 0 1-2.224.084 4.926 4.926 0 0 0 4.6 3.42A9.868 9.868 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636a10.012 10.012 0 0 0 2.46-2.548z" />
                </svg>
              </a>
            </div>
            <p className="mt-2 text-xs" role="status">
              {message}
            </p>
          </div>
        </div>
        {imageZoomOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setImageZoomOpen(false)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar imagem ampliada"
              className="absolute right-4 top-4 text-white"
              onClick={() => setImageZoomOpen(false)}
            >
              <X />
            </Button>
            <img
              src={nft.image}
              alt={`Arte digital ampliada ${nft.name}`}
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 rounded-t-[26px] border-t border-line bg-panel p-5 shadow-2xl md:hidden">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus size={15} />
            </Button>
            <span aria-live="polite">{quantity}</span>
            <Button
              size="icon"
              variant="outline"
              aria-label="Aumentar quantidade"
              disabled={quantity >= nft.available}
              onClick={() => setQuantity(Math.min(nft.available, quantity + 1))}
            >
              <Plus size={15} />
            </Button>
          </div>
          <strong className="ml-auto whitespace-nowrap text-lg text-amber">
            {nft.price} ETH
          </strong>
          <Button
            className="min-w-24 rounded-md px-3 text-xs uppercase"
            onClick={() => void addToCart(true)}
          >
            Comprar
          </Button>
          <Button
            variant="outline"
            className="rounded-md px-2.5"
            aria-label={
              favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
            }
            onClick={() => favoriteMutation.mutate()}
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} />
          </Button>
        </div>
        <div className="mt-12">
          <div className="flex gap-6 border-b border-line">
            {["Detalhes do NFT", "Avaliações de colecionadores (19)"].map(
              (label) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  onClick={() => setTab(label)}
                  className={`min-h-0 h-auto rounded-none px-0 pb-2 pt-0 text-base font-normal hover:bg-transparent md:text-lg ${tab === label ? "border-b-2 border-copper font-bold text-amber" : "text-white"}`}
                >
                  {label}
                </Button>
              ),
            )}
          </div>
          {tab === "Detalhes do NFT" ? (
            <div className="space-y-5 py-4 text-sm leading-6 text-sand md:text-base md:leading-7">
              <p>
                {nft.name} é uma obra digital 1/{nft.edition} finalizada à mão
                da coleção {nft.collection}. Cada atributo fica armazenado nos
                metadados do token e verificado na rede {nft.network}. A obra
                explora identidade, movimento e luz em um mundo digital sem
                fronteiras.
              </p>
              <p>
                A propriedade inclui a arte em alta resolução, lançamentos
                exclusivos para colecionadores e um registro permanente de
                procedência registrado na rede. {nft.artist} recebe 5% de
                direitos autorais nas vendas secundárias, apoiando novos
                trabalhos e lançamentos da comunidade.
              </p>
              <div>
                <h3 className="font-bold text-white">Rede:</h3>
                <p>
                  Cunhado na {nft.network} com procedência imutável e metadados
                  armazenados no IPFS.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white">Contrato:</h3>
                <p>
                  Direitos autorais do criador: 5% nas vendas secundárias, pagos
                  automaticamente pelos mercados compatíveis.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white">Direitos autorais:</h3>
                <p>0x7A42...19E8 · Contrato inteligente ERC-721 verificado.</p>
              </div>
            </div>
          ) : (
            <p className="py-5 text-sand">
              Colecionadores avaliaram esta obra com nota {nft.rating} de 5.
            </p>
          )}
        </div>
        <section className="mt-10">
          <h2 className="mb-5 border-b border-line pb-3 font-bold text-amber">
            Mais desta coleção
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              "sage-nomad-009",
              "violet-nomad-314",
              "ivory-baron-088",
              "golden-beat-207",
              "golden-signal-160",
            ].map((id) => (
              <RelatedNft key={id} id={id} />
            ))}
          </div>
        </section>
      </section>
    );
  }

  function RelatedNft({ id }: { id: string }) {
    const { data: nft } = useQuery({
      queryKey: ["nft", id],
      queryFn: () => api.nft(id),
    });
    if (!nft) return <NftCardSkeleton />;
    return <NftCard nft={nft} favorite={false} />;
  }

  function NftCardSkeleton() {
    return (
      <article className="min-w-0">
        <div className="overflow-hidden rounded-xl bg-panel p-2">
          <div className="shimmer aspect-square rounded-lg" />
        </div>
        <div className="shimmer mt-3 h-4 w-4/5 rounded" />
        <div className="shimmer mt-2 h-4 w-1/3 rounded" />
      </article>
    );
  }

  function DetailLoader() {
    return (
      <section className="mx-auto min-h-[2050px] max-w-300 px-5 py-7 md:min-h-[1100px] md:py-8">
        <div className="shimmer mb-6 h-4 w-40 rounded" />
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="shimmer aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="shimmer h-8 w-3/4 rounded" />
            <div className="shimmer h-10 w-full rounded" />
            <div className="shimmer h-4 w-28 rounded" />
            <div className="shimmer h-24 rounded" />
            <div className="shimmer h-10 w-32 rounded" />
            <div className="shimmer h-20 rounded" />
          </div>
        </div>
        <div className="mt-12 flex h-10 gap-6 border-b border-line">
          <div className="shimmer h-5 w-32 rounded" />
          <div className="shimmer h-5 w-52 rounded" />
        </div>
        <div className="space-y-4 py-5">
          <div className="shimmer h-4 rounded" />
          <div className="shimmer h-4 rounded" />
          <div className="shimmer h-4 w-3/4 rounded" />
        </div>
        <section className="mt-10">
          <div className="shimmer mb-5 h-8 rounded" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <NftCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </section>
    );
  }

  const detailRoute = createRoute({
    getParentRoute,
    path: "/nft/$nftId",
    component: DetailPage,
  });
  return detailRoute;
}
