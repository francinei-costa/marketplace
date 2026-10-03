import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useForm,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { api } from "../../api";
import type { Network, Wallet } from "../../types";
import { errorMessage } from "../../lib/error-message";
import { PageLoader } from "../layout/page-loader";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { ProfileMenu, RequiredMark } from "./profile-page";

const walletFormSchema = z.object({
  displayName: z.string().min(2, "Informe o nome de exibição."),
  alias: z.string().min(2, "Informe o apelido da carteira."),
  network: z
    .enum(["", "Ethereum", "Polygon", "Solana"])
    .refine((network): network is Network => network !== "", "Selecione uma rede."),
  ens: z.string().min(2, "Informe o nome do perfil."),
  address: z.string().min(6, "Informe o endereço da carteira."),
  secondaryEns: z.string(),
  type: z.string().min(2, "Selecione o tipo de carteira."),
  referralCode: z.string().min(1, "Informe o código de indicação."),
  email: z.string().email("Informe um e-mail válido."),
  ensName: z.string().min(2, "Informe o nome ENS."),
  primary: z.boolean(),
});

type WalletFormInput = z.input<typeof walletFormSchema>;
type WalletFormFields = z.output<typeof walletFormSchema>;

const emptyWallet: WalletFormInput = {
  displayName: "",
  alias: "",
  network: "",
  ens: "",
  address: "",
  secondaryEns: "",
  type: "",
  referralCode: "",
  email: "",
  ensName: "",
  primary: true,
};

export function WalletsPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const formElement = useRef<HTMLFormElement>(null);
  const { data: user, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
  });
  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
    enabled: Boolean(user),
  });
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [formMode, setFormMode] = useState<"primary" | "secondary" | "editing">(
    "primary",
  );
  const form = useForm<WalletFormInput, unknown, WalletFormFields>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: emptyWallet,
  });
  const resetForm = form.reset;
  const save = useMutation({
    mutationFn: (values: WalletFormFields) => {
      const {
        network,
        secondaryEns,
        email,
        referralCode,
        ensName,
        ...wallet
      } = values;
      return api.saveWallet({
        ...wallet,
        network,
        secondaryEns: secondaryEns || undefined,
        email,
        referralCode,
        ensName: `${ensName}.eth`,
        ...(editingId ? { id: editingId } : {}),
      });
    },
    onSuccess: async (_, values) => {
      setNotice("Carteira salva.");
      setEditingId(undefined);
      setFormMode(values.primary ? "primary" : "secondary");
      form.reset(emptyWallet);
      await client.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (error) => setNotice(errorMessage(error)),
  });
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      client.clear();
      client.setQueryData(["session"], null);
      void navigate({ to: "/" });
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  useEffect(() => {
    if (formMode !== "primary") return;
    const primaryWallet = wallets.find((wallet) => wallet.primary);
    if (!primaryWallet) return;
    resetForm({
      ...emptyWallet,
      ...primaryWallet,
      secondaryEns: primaryWallet.secondaryEns ?? "",
      referralCode: primaryWallet.referralCode ?? "",
      email: primaryWallet.email ?? "",
      ensName: (primaryWallet.ensName ?? "").replace(/\.eth$/, ""),
    });
  }, [formMode, resetForm, wallets]);

  useEffect(() => {
    if (!isLoading && !user)
      void navigate({ to: "/login", search: { next: "/wallets" } });
  }, [isLoading, navigate, user]);

  if (isLoading || !user) return <PageLoader />;

  const secondaryWallets = wallets.filter((wallet) => !wallet.primary);

  function beginAdding(primary: boolean) {
    setEditingId(undefined);
    setFormMode(primary ? "primary" : "secondary");
    setNotice("");
    form.reset({ ...emptyWallet, primary });
    formElement.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() =>
      formElement.current
        ?.querySelector<HTMLInputElement>("#wallet-display-name")
        ?.focus(),
    );
  }

  function editWallet(wallet: Wallet) {
    setEditingId(wallet.id);
    setFormMode("editing");
    form.reset({
      ...emptyWallet,
      ...wallet,
      secondaryEns: wallet.secondaryEns ?? "",
      referralCode: wallet.referralCode ?? "",
      email: wallet.email ?? "",
      ensName: (wallet.ensName ?? "").replace(/\.eth$/, ""),
    });
    formElement.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="relative mx-auto grid w-full max-w-300 grid-cols-1 gap-5 px-5 py-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-[23px] lg:px-0">
      <ProfileMenu
        active="wallets"
        logoutPending={logout.isPending}
        onLogout={() => logout.mutate()}
      />
      <div className="min-w-0 w-full lg:max-w-[1200px]">
        <div className="mb-7 flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Carteira principal</h2>
            <p className="mt-1 text-xs leading-5 text-sand">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs
              comprados.
            </p>
          </div>
          <Button
            type="button"
            variant="link"
            className="min-h-0 shrink-0 p-0 font-normal lg:absolute lg:right-0 lg:top-8"
            onClick={() => beginAdding(true)}
          >
            Adicionar
          </Button>
        </div>

        <form
          ref={formElement}
          onSubmit={form.handleSubmit(
            (values) => save.mutate(values),
            () => setNotice("Revise os campos destacados antes de salvar."),
          )}
          className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 lg:grid-cols-2"
        >
          <div className="min-w-0">
            <label className="mb-2 block" htmlFor="wallet-display-name">
              Nome de exibição <RequiredMark />
            </label>
            <Input
              id="wallet-display-name"
              className="h-8"
              aria-invalid={Boolean(form.formState.errors.displayName)}
              aria-describedby={
                form.formState.errors.displayName
                  ? "wallet-display-name-error"
                  : undefined
              }
              {...form.register("displayName")}
            />
            <WalletFieldError
              id="wallet-display-name-error"
              message={form.formState.errors.displayName?.message}
            />
          </div>
          <WalletInput form={form} name="alias" label="Apelido da carteira" />
          <div className="min-w-0">
            <label className="mb-2 block" htmlFor="wallet-network">
              Rede <RequiredMark />
            </label>
            <Controller
              control={form.control}
              name="network"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="wallet-network"
                    aria-label="Rede da carteira"
                    className="h-8"
                    aria-invalid={Boolean(form.formState.errors.network)}
                    aria-describedby={
                      form.formState.errors.network
                        ? "wallet-network-error"
                        : undefined
                    }
                  >
                    <span>{field.value || "Selecione uma rede"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ethereum">Ethereum</SelectItem>
                    <SelectItem value="Polygon">Polygon</SelectItem>
                    <SelectItem value="Solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <WalletFieldError
              id="wallet-network-error"
              message={form.formState.errors.network?.message}
            />
          </div>
          <WalletInput form={form} name="ens" label="Nome do perfil" />
          <WalletInput
            form={form}
            name="address"
            label="Endereço da carteira"
            placeholder="Endereço 0x da carteira"
          />
          <WalletInput
            form={form}
            name="secondaryEns"
            label="ENS ou carteira secundária (opcional)"
            required={false}
          />
          <div className="min-w-0">
            <label className="mb-2 block" htmlFor="wallet-type">
              Tipo de carteira <RequiredMark />
            </label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="wallet-type"
                    aria-label="Tipo de carteira"
                    className="h-8"
                    aria-invalid={Boolean(form.formState.errors.type)}
                    aria-describedby={
                      form.formState.errors.type
                        ? "wallet-type-error"
                        : undefined
                    }
                  >
                    <span>{field.value || "Selecione uma carteira"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MetaMask">MetaMask</SelectItem>
                    <SelectItem value="WalletConnect">WalletConnect</SelectItem>
                    <SelectItem value="Coinbase Wallet">
                      Coinbase Wallet
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <WalletFieldError
              id="wallet-type-error"
              message={form.formState.errors.type?.message}
            />
          </div>
          <WalletInput
            form={form}
            name="referralCode"
            label="Código de indicação"
          />
          <WalletInput form={form} name="email" label="E-mail" type="email" />
          <div className="min-w-0">
            <label className="mb-2 block" htmlFor="wallet-ens-name">
              Nome ENS <RequiredMark />
            </label>
            <div className="flex gap-2">
              <Select value=".eth" disabled>
                <SelectTrigger
                  aria-label="Sufixo ENS"
                  className="h-8 w-[68px] shrink-0 px-2"
                >
                  <span>.eth</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".eth">.eth</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="wallet-ens-name"
                className="h-8"
                aria-label="Nome ENS"
                aria-invalid={Boolean(form.formState.errors.ensName)}
                aria-describedby={
                  form.formState.errors.ensName
                    ? "wallet-ens-name-error"
                    : undefined
                }
                {...form.register("ensName")}
              />
            </div>
            <WalletFieldError
              id="wallet-ens-name-error"
              message={form.formState.errors.ensName?.message}
            />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <Button
              type="submit"
              className="w-[131px] h-[40px] min-h-0 px-3 text-xs font-bold text-[14px] leading-[16px] tracking-normal text-center"
              disabled={save.isPending}
            >
              {save.isPending ? "Salvando..." : "Salvar carteira"}
            </Button>
            <span className="ml-3 text-sm text-amber" role="status">
              {notice}
            </span>
          </div>
        </form>

        <section
          className="mt-6 min-w-0"
          aria-labelledby="secondary-wallet-heading"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 id="secondary-wallet-heading" className="font-bold">
              Carteira secundária
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-copper"
              />
              <span>Igual à carteira principal</span>
              <Button
                type="button"
                variant="link"
                className="min-h-0 p-0 font-normal"
                onClick={() => beginAdding(false)}
              >
                Adicionar
              </Button>
            </div>
          </div>
          {secondaryWallets.length ? (
            <div className="space-y-2">
              {secondaryWallets.map((wallet) => (
                <article
                  key={wallet.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold">{wallet.displayName}</p>
                    <p className="mt-1 text-xs text-sand">
                      {wallet.alias} · {wallet.network}
                    </p>
                    <p className="text-[10px] text-muted">
                      {wallet.address} · {wallet.type}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editWallet(wallet)}
                  >
                    Editar
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sand">
              Você ainda não adicionou uma carteira secundária.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function WalletInput({
  form,
  name,
  label,
  type = "text",
  placeholder,
  required = true,
}: {
  form: UseFormReturn<WalletFormInput, unknown, WalletFormFields>;
  name: "alias" | "ens" | "address" | "secondaryEns" | "referralCode" | "email";
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const rawError = form.formState.errors[name]?.message;
  const error = typeof rawError === "string" ? rawError : undefined;
  return (
    <div>
      <label className="mb-2 block" htmlFor={`wallet-${name}`}>
        {label} {required && <RequiredMark />}
      </label>
      <Input
        id={`wallet-${name}`}
        className="h-8"
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `wallet-${name}-error` : undefined}
        {...form.register(name)}
      />
      <WalletFieldError id={`wallet-${name}-error`} message={error} />
    </div>
  );
}

function WalletFieldError({
  id,
  message,
}: {
  id: string;
  message?: unknown;
}) {
  if (typeof message !== "string") return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-400">
      {message}
    </p>
  );
}
