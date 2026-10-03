import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, multiplyEth } from "../../api";
import type { CartLine } from "../../types";
import { NftCard } from "../catalog/nft-card";
import { PageIntro } from "../layout/page-intro";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { QuoteSummary } from "./quote-summary";
import { errorMessage } from "../../lib/error-message";

export function CartPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const { data: cart = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: api.cart,
  });
  const nftQueries = useQueries({
    queries: cart.map((line) => ({
      queryKey: ["nft", line.nftId],
      queryFn: () => api.nft(line.nftId),
    })),
  });
  const catalog = useQuery({
    queryKey: ["catalog", "cart"],
    queryFn: () => api.catalog({}),
  });
  const quote = useQuery({
    queryKey: ["quote", coupon],
    queryFn: () => api.quote(coupon),
    enabled: !isLoading,
  });
  const updateMutation = useMutation({
    mutationFn: ({ nftId, quantity }: CartLine) =>
      api.updateCart(nftId, quantity),
    onSuccess: (lines) => {
      client.setQueryData(["cart"], lines);
      void client.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (error) => setNotice(errorMessage(error)),
  });
  const removeMutation = useMutation({
    mutationFn: (nftId: string) => api.removeFromCart(nftId),
    onSuccess: (lines) => {
      client.setQueryData(["cart"], lines);
      void client.invalidateQueries({ queryKey: ["quote"] });
    },
  });
  const items = cart.flatMap((line, index) => {
    const nft = nftQueries[index]?.data;
    return nft ? [{ ...line, nft }] : [];
  });
  const nftLoadError = nftQueries.find((query) => query.isError)?.error;

  async function applyCoupon(event: FormEvent) {
    event.preventDefault();
    setCoupon(couponInput);
    setNotice("");
    try {
      await api.quote(couponInput);
      await client.invalidateQueries({ queryKey: ["quote"] });
      setNotice(couponInput ? "Cupom aplicado à cotação." : "Cupom removido.");
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  if (isLoading || catalog.isLoading || nftQueries.some((query) => query.isLoading))
    return <CartPageLoader />;

  return (
    <section className="mx-auto max-w-300 px-5 py-7 text-xs">
      <PageIntro title="Mercado / Carrinho" />
      {cart.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 size-10 text-copper" />
          <h1 className="text-xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-sand">
            Explore as coleções e encontre seu próximo NFT.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div>
              <div className="mb-3 hidden grid-cols-[72px_minmax(0,1fr)_90px_92px_100px_24px] gap-3 border-b border-line pb-3 text-xs text-white sm:grid">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
                <span />
              </div>
              <div className="space-y-3">
                {items.map(({ nft, quantity }) => (
                  <article
                    key={nft.id}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 bg-panel p-2 sm:grid-cols-[72px_minmax(0,1fr)_90px_92px_100px_24px] sm:gap-3"
                  >
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="size-[72px] rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold">{nft.name}</h2>
                      <p className="text-xs text-muted">
                        ID do token: #{nft.tokenId}
                      </p>
                      <p className="mt-1 text-xs text-amber sm:hidden">
                        {nft.price} ETH
                      </p>
                    </div>
                    {nftLoadError && (
                      <p className="mt-3 text-sm text-amber" role="alert">
                        Não foi possível carregar todos os itens do carrinho:{" "}
                        {errorMessage(nftLoadError)}
                      </p>
                    )}
                    <span className="hidden text-sand sm:block">
                      {nft.price} ETH
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-7.5 rounded-[20px] bg-copper p-0 text-ink hover:bg-amber hover:text-ink"
                        aria-label={`Diminuir ${nft.name}`}
                        onClick={() =>
                          quantity > 1 &&
                          updateMutation.mutate({
                            nftId: nft.id,
                            quantity: quantity - 1,
                          })
                        }
                      >
                        <Minus size={12} />
                      </Button>
                      <span>{quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-7.5 rounded-[20px] bg-copper p-0 text-ink hover:bg-amber hover:text-ink"
                        aria-label={`Aumentar ${nft.name}`}
                        disabled={quantity >= Math.min(9, nft.available)}
                        onClick={() =>
                          updateMutation.mutate({
                            nftId: nft.id,
                            quantity: quantity + 1,
                          })
                        }
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                    <span className="hidden font-bold text-amber sm:block">
                      {multiplyEth(nft.price, quantity)} ETH
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 p-0 text-sand hover:text-amber"
                      aria-label={`Remover ${nft.name}`}
                      onClick={() => removeMutation.mutate(nft.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-sm text-amber sm:hidden">
                Total dos itens:{" "}
                {items
                  .reduce(
                    (sum, item) =>
                      sum + Number(multiplyEth(item.nft.price, item.quantity)),
                    0,
                  )
                  .toFixed(3)}{" "}
                ETH
              </p>
            </div>
            <aside className="fixed inset-x-0 bottom-0 z-20 max-h-[48vh] overflow-y-auto rounded-t-[26px] border-t border-line bg-panel p-5 shadow-2xl lg:static lg:h-fit lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-panel lg:p-[18px] lg:shadow-none">
              <h2 className="mb-5 border-b border-line pb-3 text-sm font-bold">
                Resumo da carteira
              </h2>
              <form onSubmit={(event) => void applyCoupon(event)}>
                <label
                  htmlFor="coupon"
                  className="mb-2 block text-xs font-bold"
                >
                  Código promocional
                </label>
                <div className="flex">
                  <Input
                    id="coupon"
                    className="h-10 rounded-r-none px-3 text-xs"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Digite o código promocional..."
                  />
                  <Button
                    type="submit"
                    className="h-10 min-h-10 rounded-l-none px-3 text-xs cursor-pointer"
                  >
                    Aplicar
                  </Button>
                </div>
              </form>
              <p className="mt-2 text-xs text-sand" role="status">
                {notice ||
                  (quote.isError
                    ? errorMessage(quote.error)
                    : quote.data?.coupon
                      ? `Cupom aplicado: ${quote.data.coupon}`
                      : "")}
              </p>
              <QuoteSummary quote={quote.data} loading={quote.isLoading} />
              <Button
                className="mt-5 h-10 min-h-10 w-full text-xs cursor-pointer"
                disabled={items.length !== cart.length || Boolean(nftLoadError)}
                onClick={() => void navigate({ to: "/checkout" })}
              >
                Conectar e finalizar
              </Button>
              <Link
                to="/"
                className="mt-3 block text-center text-xs text-amber"
              >
                Continuar explorando
              </Link>
            </aside>
          </div>
          <section className="mt-20">
            <h2 className="mb-5 border-b border-line pb-3 font-bold text-amber">
              Colecionadores também viram
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {catalog.data?.items.slice(0, 5).map((nft) => (
                <NftCard key={nft.id} nft={nft} favorite={false} />
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function CartPageLoader() {
  return (
    <div
      className="mx-auto min-h-[45vh] max-w-300 px-5 py-10"
      role="status"
      aria-label="Carregando"
    >
      <div className="shimmer h-8 w-48 rounded" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="shimmer aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
