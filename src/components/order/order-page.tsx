import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { api, multiplyEth } from "../../api";
import type { Order } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SummaryRow } from "../cart/quote-summary";
import { errorMessage } from "../../lib/error-message";

export function OrderPage({ orderId }: { orderId: string }) {
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();
  const { data: user } = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
  });
  const { data: order, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.order(orderId),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  const client = useQueryClient();

  useEffect(() => {
    if (user === undefined) return;
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("order.subscribe", orderId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order.updated", (updated: Order) => {
      if (updated.id === orderId) {
        const current = client.getQueryData<Order>(["order", orderId]);
        if (!current || updated.version > current.version) {
          client.setQueryData(["order", orderId], updated);
          void client.invalidateQueries({ queryKey: ["cart"] });
        }
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [client, orderId, user]);

  if (isError)
    return <OrderError message="Não foi possível recuperar este pedido." />;
  if (!order) return <OrderLoader />;

  return (
    <>
    <section className="flex min-h-screen justify-center bg-ink px-0">
      <article className="relative min-h-screen w-full max-w-[578px] overflow-hidden border-b-[10px] border-copper bg-panel">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          className="absolute right-2 top-2 min-h-8 text-copper hover:bg-transparent hover:text-amber"
          onClick={() => void navigate({ to: "/" })}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-4"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </Button>
        <div className="border-b border-copper px-6 pb-5 pt-5 text-center">
          <div className="mx-auto mb-3 grid h-20 w-[68px] place-items-center text-copper">
            {order.status === "confirmed" ? (
              <ThankYouEnvelope />
            ) : order.status === "rejected" ? (
              <span aria-hidden="true">×</span>
            ) : (
              <span className="animate-pulse">…</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#CFB28C]">
            {order.status === "confirmed"
              ? "Seus NFTs agora estão na sua carteira"
              : order.status === "rejected"
                ? "Pagamento não confirmado"
                : "Pedido pendente"}
          </h1>
          {order.status !== "confirmed" && (
            <p className="mt-2 text-xs text-sand" role="status">
              {order.status === "pending"
                ? `Aguardando retorno · ${connected ? "conectado" : "reconectando"}`
                : "A carteira recusou a transação. Seus itens continuam no carrinho."}
            </p>
          )}
        </div>
        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.9fr] border-b border-copper px-5 py-4 text-xs sm:text-sm">
          <span className="min-w-0 border-r border-copper pr-2 text-[#CFB28C] font-normal text-[15px] leading-none tracking-normal">
            ID da transação
            <br />
            <b className="block truncate text-sand">{order.transactionId}</b>
          </span>
          <span className="min-w-0 border-r border-copper px-2 text-[#CFB28C] font-normal text-[15px] leading-none tracking-normal">
            Data
            <br />
            <b className="whitespace-nowrap text-sand">
              {(() => {
                const date = new Date(order.createdAt);
                const parts = new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).formatToParts(date);
                const day = parts.find((part) => part.type === "day")?.value;
                const month = parts.find(
                  (part) => part.type === "month",
                )?.value;
                const year = parts.find((part) => part.type === "year")?.value;
                return `${day} ${month}, ${year}`;
              })()}
            </b>
          </span>
          <span className="min-w-0 border-r border-copper px-2 text-[#CFB28C] font-normal text-[15px] leading-none tracking-normal">
            Total
            <br />
            <b className="whitespace-nowrap text-sand">
              {order.quote.total} ETH
            </b>
          </span>
          <span className="min-w-0 pl-2 text-[#CFB28C] font-normal text-[15px] leading-none tracking-normal">
            Carteira
            <br />
            <b className="whitespace-nowrap text-sand">{order.walletName}</b>
          </span>
        </div>
        <div className="px-5 pb-12 pt-5 sm:px-11">
          <h2 className="mb-3 font-bold">Detalhes da transação</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_76px_98px] gap-2 border-b border-line pb-2 font-bold">
            <span>NFTs</span>
            <span className="text-center">Edições</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="space-y-3 py-3">
            {order.items.map((item) => (
              <div
                key={item.nftId}
                className="grid grid-cols-[minmax(0,1fr)_76px_98px] items-center gap-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={item.nft.image}
                    alt=""
                    className="size-[70px] shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{item.nft.name}</h3>
                    <p className="text-xs text-muted">
                      ID do token: #{item.nft.tokenId}
                    </p>
                  </div>
                </div>
                <span className="text-center text-sand">
                  (× {item.quantity})
                </span>
                <span className="whitespace-nowrap text-right font-bold text-amber">
                  {multiplyEth(item.unitPrice, item.quantity)} ETH
                </span>
              </div>
            ))}
          </div>
          <div className="ml-auto w-full space-y-2 border-b border-line pb-3 pt-1">
            <SummaryRow
              label="Taxa de rede"
              value={`${order.quote.networkFee} ETH`}
            />
            <SummaryRow
              label="Total"
              value={`${order.quote.total} ETH`}
              strong
            />
          </div>
          {order.status === "confirmed" ? (
            <div className="mx-auto flex h-[134px] w-full max-w-[490px] flex-col items-center justify-between border-t border-line pt-4">
              <p className="w-[490px] h-[66px] font-normal text-[14px] leading-[22px] tracking-normal text-center align-middle text-sand ">
                Transação confirmada na Ethereum. A propriedade foi transferida
                para sua carteira conectada e registrada na rede.
              </p>
                <Button
                  type="button"
                  className="mx-auto flex w-fit px-4 w-[186px] h-[48px]"
                  onClick={() =>
                    void navigate({
                      to: "/",
                      search: {
                        q: "",
                        category: "",
                        network: "",
                        sort: "recentes",
                        page: 1,
                        min: "0.02",
                        max: "12.3",
                        authMode: "login",
                        next: `/order/${orderId}`,
                      },
                    })
                  }
                >
                  Ver no Etherscan
                </Button>
            </div>
          ) : (
            <>
              <p className="my-5 text-center text-sm leading-6 text-sand">
                {order.status === "pending"
                  ? "O estado será atualizado automaticamente quando a simulação confirmar o pedido."
                  : "Você pode tentar novamente com a mesma cotação."}
              </p>
              {order.status === "rejected" ? (
                <Button asChild className="mx-auto flex">
                  <Link to="/cart">Voltar ao carrinho</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mx-auto flex"
                  onClick={() =>
                    void client.invalidateQueries({
                      queryKey: ["order", orderId],
                    })
                  }
                >
                  Atualizar status
                </Button>
              )}
            </>
          )}
        </div>
      </article>
    </section>
    </>
  );
}

export function PostPurchaseAuth({
  orderId,
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: {
  orderId?: string;
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: { username: "", email: "", password: "", confirm: "" },
  });
  const onSuccess = (user: Awaited<ReturnType<typeof api.login>>) => {
    client.clear();
    client.setQueryData(["session"], user);
    if (orderId) {
      void client.invalidateQueries({ queryKey: ["order", orderId] });
    }
    onAuthenticated();
  };
  const loginMutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      api.login(values.email, values.password, orderId),
    onSuccess,
    onError: (error) => setNotice(errorMessage(error)),
  });
  const registerMutation = useMutation({
    mutationFn: (values: {
      username: string;
      email: string;
      password: string;
    }) => api.register(values.username, values.email, values.password, orderId),
    onSuccess,
    onError: (error) => setNotice(errorMessage(error)),
  });
  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-0 md:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-auth-title"
        className="relative flex min-h-screen w-full flex-col justify-center overflow-y-auto border-b-4 border-copper bg-panel px-7 py-10 md:min-h-0 md:h-[600px] md:w-[500px] md:max-w-full md:justify-start md:px-[80px] md:pb-0 md:pt-[54px]"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          className="absolute right-3 top-3 size-7 min-h-0 p-0"
          onClick={onClose}
        >
          <span aria-hidden="true" className="text-xl leading-none text-copper">×</span>
        </Button>
        <div className="mb-8 text-center text-3xl font-black tracking-[0.14em] md:hidden">
          KURIO
        </div>
        <div
          id="order-auth-title"
          className="mb-8 flex justify-center gap-2 text-xl font-bold leading-7 md:mb-[34px]"
        >
          <button
            type="button"
            className={mode === "login" ? "text-amber" : "text-white"}
            onClick={() => onModeChange("login")}
          >
            Entrar
          </button>
          <span className="text-copper">|</span>
          <button
            type="button"
            className={mode === "register" ? "text-amber" : "text-white"}
            onClick={() => onModeChange("register")}
          >
            Criar conta
          </button>
        </div>
        <p className="mb-6 text-center text-xs leading-4 text-sand md:mb-[35px]">
          {mode === "login"
            ? "Entre para gerenciar sua carteira, coleção e perfil de criador."
            : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            setNotice("");
            if (mode === "login") {
              loginMutation.mutate({
                email: values.email,
                password: values.password,
              });
              return;
            }
            if (values.username.trim().length < 3) {
              setNotice("Use ao menos 3 caracteres no nome de usuário.");
              return;
            }
            if (values.password.length < 8) {
              setNotice("A senha deve ter ao menos 8 caracteres.");
              return;
            }
            if (values.password !== values.confirm) {
              setNotice("As senhas não coincidem.");
              return;
            }
            registerMutation.mutate(values);
          })}
        >
          {mode === "register" && (
            <Input
              aria-label="Nome de usuário"
              placeholder="Nome de usuário"
              required
              {...form.register("username")}
            />
          )}
          <Input
            aria-label="E-mail"
            type="email"
            placeholder="contato@email.com"
            required
            className="md:h-10 md:bg-transparent"
            {...form.register("email")}
          />
          <div className="relative">
            <Input
              aria-label="Senha"
              type={passwordVisible ? "text" : "password"}
              placeholder="Senha"
              minLength={8}
              required
              className="pr-11 md:h-10 md:bg-transparent"
              {...form.register("password")}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={passwordVisible}
              className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-amber"
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          {mode === "login" && (
            <p className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-0 h-auto p-0 font-normal text-amber hover:bg-transparent"
                disabled
              >
                Esqueceu a senha?
              </Button>
            </p>
          )}
          {mode === "register" && (
            <Input
              aria-label="Confirmar senha"
              type="password"
              placeholder="Confirmar senha"
              required
              {...form.register("confirm")}
            />
          )}
          {notice && (
            <p className="text-sm text-red-300" role="alert">
              {notice}
            </p>
          )}
          <Button className="mt-2 h-[45px] min-h-0 w-full md:bg-[#d58d4b]" disabled={isPending}>
            {isPending
              ? mode === "login"
                ? "Entrando..."
                : "Criando conta..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>
        <div className="mb-3 mt-6 flex items-center gap-3 text-xs md:-mx-20">
          <span className="h-px flex-1 bg-line" />
          <span>Ou continue com</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mb-3 h-10 w-full border-line text-sand"
          disabled
        >
          <GoogleMark />
          Continuar com Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-line text-sand"
          disabled
        >
          <FacebookMark />
          Continuar com Facebook
        </Button>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5">
      <path fill="#4285F4" d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z" />
      <path fill="#34A853" d="M10 20c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20Z" />
      <path fill="#FBBC05" d="M4.4 11.9a6 6 0 0 1 0-3.8V5.5H1.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path fill="#EA4335" d="M10 4c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 10 0a10 10 0 0 0-8.9 5.5l3.3 2.6C5.2 5.8 7.4 4 10 4Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 20" className="h-5 w-4">
      <path fill="#4267B2" d="M10.4 20v-9.1h3.1l.5-3.6h-3.6V5c0-1 .3-1.7 1.8-1.7h1.9V.1C13.2 0 12.2 0 11.1 0 7.9 0 5.8 1.9 5.8 5.4v1.9H2.7v3.6h3.1V20h4.6Z" />
    </svg>
  );
}

function ThankYouEnvelope() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 68 82"
      fill="none"
      className="h-20 w-[68px] text-copper"
    >
      <path
        d="M20 18c0-8 6-13 14-13s14 5 14 13"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect
        x="10"
        y="12"
        width="48"
        height="48"
        rx="3"
        fill="#2A1712"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <text
        x="34"
        y="31"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="700"
      >
        THANK
      </text>
      <text
        x="34"
        y="43"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="700"
      >
        YOU
      </text>
      <path
        d="M4 28v44a5 5 0 0 0 5 5h50a5 5 0 0 0 5-5V28L38 53a6 6 0 0 1-8 0L4 28Z"
        fill="#2A1712"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m5 75 20-20m38 20L43 55"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderLoader() {
  return (
    <div className="min-h-screen bg-ink" role="status" aria-label="Carregando">
      <div className="mx-auto max-w-[578px] p-6">
        <div className="shimmer h-8 w-48 rounded" />
        <div className="shimmer mt-6 h-96 rounded" />
      </div>
    </div>
  );
}

function OrderError({ message }: { message: string }) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-ink px-5 text-center">
      <div>
        <p className="text-lg text-sand">{message}</p>
        <Button asChild className="mt-5">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </section>
  );
}
