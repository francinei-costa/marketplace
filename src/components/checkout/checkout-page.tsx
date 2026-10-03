import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { api, multiplyEth } from "../../api";
import type { Network } from "../../types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { QuoteSummary } from "../cart/quote-summary";
import { PageLoader } from "../layout/page-loader";
import { PageIntro } from "../layout/page-intro";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { errorMessage } from "../../lib/error-message";

const checkoutSchema = z.object({
  displayName: z.string().min(2, "Informe seu nome de exibição."),
  username: z.string().min(2, "Informe seu nome de usuário."),
  profileName: z.string().min(2, "Informe o nome do perfil."),
  email: z.string().email("Informe um e-mail válido."),
  referral: z.string().min(1, "Informe o código de indicação."),
});

type CheckoutFields = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
  });
  const { data: cart = [], isLoading: loadingCart } = useQuery({
    queryKey: ["cart"],
    queryFn: api.cart,
  });
  const { data: quote } = useQuery({
    queryKey: ["quote"],
    queryFn: () => api.quote(),
  });
  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
    enabled: Boolean(user),
  });
  const nftQueries = useQueries({
    queries: cart.map((line) => ({
      queryKey: ["nft", line.nftId],
      queryFn: () => api.nft(line.nftId),
    })),
  });
  const [walletId, setWalletId] = useState<string>();
  const [notice, setNotice] = useState("");
  const [quoteChanged, setQuoteChanged] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState(false);
  const [checkoutNetwork, setCheckoutNetwork] = useState<Network>("Ethereum");
  const [useOtherWalletSelected, setUseOtherWalletSelected] = useState(false);
  const useOtherWallet = useOtherWalletSelected || (!loadingUser && !user);
  const [otherWalletAddress, setOtherWalletAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MetaMask");
  const originalQuoteVersion = useRef<number | undefined>(undefined);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const form = useForm<CheckoutFields>({
    resolver: zodResolver(checkoutSchema),
    values: user
      ? {
          displayName: user.displayName,
          username: user.username,
          profileName: user.ens || user.username,
          email: user.email,
          referral: "KURIO2026",
        }
      : undefined,
  });

  const selectedWalletId =
    walletId === undefined
      ? (wallets.find((wallet) => wallet.primary)?.id ?? wallets[0]?.id ?? "")
      : walletId;

  useEffect(() => {
    if (!quote) return;
    if (originalQuoteVersion.current === undefined) {
      originalQuoteVersion.current = quote.version;
    } else if (originalQuoteVersion.current !== quote.version) {
      setQuoteChanged(true);
    }
  }, [quote]);

  const items = cart.flatMap((line, index) => {
    const nft = nftQueries[index]?.data;
    return nft ? [{ ...line, nft }] : [];
  });
  const nftLoadError = nftQueries.find((query) => query.isError)?.error;

  async function submit(values: CheckoutFields) {
    if (nftLoadError || items.length !== cart.length) {
      setNotice("Não foi possível carregar todos os NFTs do pedido.");
      return;
    }
    if (quoteChanged && !confirmedQuote) {
      setNotice(
        "A cotação mudou. Revise e confirme o novo total antes de continuar.",
      );
      return;
    }
    if (!quote || (!useOtherWallet && !selectedWalletId) || !cart.length) {
      setNotice("Adicione um NFT e selecione uma carteira antes de continuar.");
      return;
    }
    if (
      useOtherWallet &&
      (!otherWalletAddress.trim() || otherWalletAddress.trim().length < 6)
    ) {
      setNotice("Informe um endereço de carteira válido.");
      return;
    }
    try {
      if (user) {
        const updatedUser = await api.updateProfile({
          displayName: values.displayName,
          username: values.username,
          ens: values.profileName,
          email: values.email,
        });
        client.setQueryData(["session"], updatedUser);
      }
      let orderWalletId = selectedWalletId;
      let orderWalletAddress: string | undefined;
      if (useOtherWallet) {
        const address = otherWalletAddress.trim();
        const existingWallet = wallets.find(
          (wallet) =>
            wallet.address.toLowerCase() === address.toLowerCase() &&
            wallet.network === checkoutNetwork,
        );
        if (existingWallet) {
          orderWalletId = existingWallet.id;
        } else if (user) {
          const savedWallets = await api.saveWallet({
            displayName: values.displayName,
            alias: `${checkoutNetwork} checkout`,
            address,
            network: checkoutNetwork,
            type: paymentMethod,
            ens: values.profileName,
            primary: false,
          });
          client.setQueryData(["wallets", user.id], savedWallets);
          orderWalletId =
            savedWallets.find(
              (wallet) =>
                wallet.address.toLowerCase() === address.toLowerCase() &&
                wallet.network === checkoutNetwork,
            )?.id ?? "";
        } else {
          orderWalletId = "";
          orderWalletAddress = address;
        }
      }
      if (user && !orderWalletId) {
        setNotice("Selecione ou cadastre uma carteira compatível com a rede.");
        return;
      }
      if (!user && !orderWalletAddress) {
        setNotice("Informe o endereço da carteira para concluir a compra.");
        return;
      }
      const order = await api.createOrder({
        quoteVersion: quote.version,
        ...(orderWalletId ? { walletId: orderWalletId } : {}),
        ...(orderWalletAddress
          ? { walletAddress: orderWalletAddress, walletName: paymentMethod }
          : {}),
        idempotencyKey,
        cart,
        coupon: quote.coupon,
      });
      await client.invalidateQueries();
      void navigate({ to: "/order/$orderId", params: { orderId: order.id } });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  if (loadingUser || loadingCart || nftQueries.some((query) => query.isLoading))
    return <PageLoader />;

  return (
    <section className="mx-auto max-w-300 py-7">
      <PageIntro title="Mercado / Pagamento" />
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px]">
          <div>
            <h1 className="mb-4 mt-1.5 text-lg font-bold">
              Perfil do colecionador
            </h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                form={form}
                name="displayName"
                label="Nome de exibição"
              />
              <FormField form={form} name="username" label="Nome de usuário" />
              <div>
                <label className="mb-2 block" htmlFor="checkout-network">
                  Rede <Required />
                </label>
                <Select
                  value={checkoutNetwork}
                  onValueChange={(value) => {
                    const network = value as Network;
                    setCheckoutNetwork(network);
                    setWalletId(
                      wallets.find((wallet) => wallet.network === network)
                        ?.id ?? "",
                    );
                  }}
                >
                  <SelectTrigger
                    id="checkout-network"
                    aria-label="Rede da compra"
                    className="h-[42px]"
                  >
                    <span>{checkoutNetwork}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {(["Ethereum", "Polygon", "Solana"] as const).map(
                      (network) => (
                        <SelectItem key={network} value={network}>
                          {network}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <FormField
                form={form}
                name="profileName"
                label="Nome do perfil"
              />
              <div>
                <label className="mb-2 block">
                  Endereço da carteira <Required />
                </label>
                <Input
                  aria-label="Endereço da carteira selecionada"
                  value={
                    useOtherWallet
                      ? otherWalletAddress
                      : (wallets.find(
                          (wallet) => wallet.id === selectedWalletId,
                        )?.address ?? "")
                  }
                  onChange={(event) =>
                    setOtherWalletAddress(event.target.value)
                  }
                  readOnly={!useOtherWallet}
                  placeholder="Endereço da carteira"
                />
              </div>
              <div>
                <label className="mb-2 block">
                  Código de indicação <Required />
                </label>
                <Input {...form.register("referral")} />
              </div>
              <FormField form={form} name="email" label="E-mail" type="email" />
              <div>
                <label className="mb-2 block">
                  Nome ENS <Required />
                </label>
                <Input defaultValue={user?.ens ?? ""} placeholder="nome.eth" />
              </div>
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm text-sand">
              <Checkbox /> Usar outra carteira?
            </label>
            <label className="mb-2 mt-5 block">
              Observação do colecionador (opcional)
            </label>
            <Textarea
              aria-label="Observação do colecionador"
              className="min-h-28 max-w-[520px]"
            />
          </div>
          <aside>
            <h2 className="mb-2 text-lg font-bold">Seus NFTs</h2>
            <div className="mb-4 grid grid-cols-[1fr_auto] border-b border-line pb-2">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <div className="space-y-2">
              {items.map(({ nft, quantity }) => (
                <div
                  key={nft.id}
                  className="flex items-center gap-2 bg-panel p-2"
                >
                  <img
                    src={nft.image}
                    alt=""
                    className="size-[68px] rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{nft.name}</h3>
                    <p className="text-xs text-muted">
                      ID do token: #{nft.tokenId}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-amber">
                    {multiplyEth(nft.price, quantity)} ETH
                  </span>
                </div>
              ))}
            </div>
            {nftLoadError && (
              <p className="mt-3 text-sm text-amber" role="alert">
                Não foi possível carregar os NFTs do pedido:{" "}
                {errorMessage(nftLoadError)}
              </p>
            )}
            <QuoteSummary quote={quote} loading={!quote} />
            {quoteChanged && (
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-sm border border-amber p-3 text-xs leading-5 text-sand">
                <Checkbox
                  className="mt-1"
                  checked={confirmedQuote}
                  onCheckedChange={(checked) =>
                    setConfirmedQuote(checked === true)
                  }
                />
                O preço, disponibilidade ou taxa mudou. Revise o total
                atualizado e confirme para continuar.
              </label>
            )}
            <h2 className="mt-5 text-center font-bold">Carteira e rede</h2>
            <div className="mt-3 space-y-2">
              <RadioGroup
                aria-label="Carteira para pagamento"
                value={selectedWalletId}
                onValueChange={(id) => {
                  setWalletId(id);
                  const selectedWallet = wallets.find(
                    (wallet) => wallet.id === id,
                  );
                  if (selectedWallet)
                    setCheckoutNetwork(selectedWallet.network);
                  setUseOtherWalletSelected(false);
                }}
              >
                {wallets
                  .filter((wallet) => wallet.network === checkoutNetwork)
                  .map((wallet) => (
                    <label
                      key={wallet.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 ${selectedWalletId === wallet.id ? "border-amber" : "border-line"}`}
                    >
                      <RadioGroupItem value={wallet.id} />
                      <span>
                        {wallet.type} · {wallet.alias || wallet.network}
                      </span>
                    </label>
                  ))}
              </RadioGroup>
              {!wallets.some(
                (wallet) => wallet.network === checkoutNetwork,
              ) && (
                <p className="text-sm text-sand">
                  Nenhuma carteira cadastrada nesta rede.{" "}
                  <Link to="/wallets" className="text-amber">
                    Adicionar carteira
                  </Link>
                </p>
              )}
            </div>
            {user && (
              <label className="mt-4 flex items-center gap-3 text-sm text-sand">
                <Checkbox
                  checked={useOtherWallet}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setUseOtherWalletSelected(enabled);
                    setWalletId(
                      enabled
                        ? ""
                        : (wallets.find(
                            (wallet) => wallet.network === checkoutNetwork,
                          )?.id ?? ""),
                    );
                  }}
                />
                Usar outra carteira?
              </label>
            )}
            {useOtherWallet && (
              <div className="mt-3">
                <label className="mb-2 block" htmlFor="other-wallet-address">
                  Endereço da carteira <Required />
                </label>
                <Input
                  id="other-wallet-address"
                  value={otherWalletAddress}
                  onChange={(event) =>
                    setOtherWalletAddress(event.target.value)
                  }
                  placeholder="Endereço da carteira"
                  aria-invalid={
                    Boolean(notice) &&
                    (!otherWalletAddress.trim() ||
                      otherWalletAddress.trim().length < 6)
                  }
                />
              </div>
            )}
            <label className="mt-4 block font-bold">Método de pagamento</label>
            <RadioGroup
              aria-label="Método de pagamento"
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="mt-2 grid grid-cols-3 gap-2"
            >
              {["MetaMask", "WalletConnect", "Coinbase Wallet"].map(
                (wallet) => (
                  <label
                    key={wallet}
                    className="flex cursor-pointer items-center gap-2 rounded-sm border border-line p-3 text-xs"
                  >
                    <RadioGroupItem value={wallet} />
                    {wallet}
                  </label>
                ),
              )}
            </RadioGroup>
            <p className="mt-4 text-sm text-amber" role="status">
              {notice}
            </p>
            <Button
              className="fixed inset-x-6 bottom-5 z-20 w-auto rounded-full md:static md:mt-4 md:w-full md:rounded-md cursor-pointer"
              disabled={
                (!useOtherWallet && (!user || !selectedWalletId)) ||
                (useOtherWallet &&
                  (!otherWalletAddress.trim() ||
                    otherWalletAddress.trim().length < 6)) ||
                Boolean(nftLoadError) ||
                items.length !== cart.length ||
                form.formState.isSubmitting
              }
            >
              {form.formState.isSubmitting
                ? "Enviando pedido..."
                : "Confirmar compra"}
            </Button>
          </aside>
        </div>
      </form>
    </section>
  );
}

function FormField<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  inputClassName,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type?: string;
  inputClassName?: string;
}) {
  const rawMessage = form.formState.errors[name]?.message;
  const error = typeof rawMessage === "string" ? rawMessage : undefined;
  return (
    <div>
      <label className="mb-2 block" htmlFor={`field-${name}`}>
        {label} <Required />
      </label>
      <Input
        id={`field-${name}`}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `error-${name}` : undefined}
        className={inputClassName}
        {...form.register(name)}
      />
      {error && (
        <p id={`error-${name}`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Required() {
  return (
    <span className="text-orange-400" aria-hidden="true">
      *
    </span>
  );
}
