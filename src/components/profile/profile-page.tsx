import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Download,
  Eye,
  EyeOff,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { api } from "../../api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { errorMessage } from "../../lib/error-message";
import { PageLoader } from "../layout/page-loader";

const profileSchema = z
  .object({
    displayName: z.string().min(2, "Informe seu nome de exibição."),
    username: z.string().min(3, "Use ao menos 3 caracteres."),
    email: z.string().email("Informe um e-mail válido."),
    ens: z.string(),
    walletAlias: z.string().min(2, "Informe o apelido da carteira."),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (value) =>
      !value.newPassword || value.newPassword === value.confirmPassword,
    {
      message: "As senhas não coincidem.",
      path: ["confirmPassword"],
    },
  );

type ProfileFields = z.infer<typeof profileSchema>;

export function ProfileMenu({
  active,
  logoutPending,
  onLogout,
}: {
  active: "profile" | "wallets";
  logoutPending: boolean;
  onLogout: () => void;
}) {
  return (
    <aside className="h-fit w-full bg-panel">
      <h1 className="mb-4 text-lg font-bold">Meu perfil</h1>
      <nav aria-label="Menu do perfil">
        <Link
          to="/profile"
          className={`profile-link ${active === "profile" ? "profile-link-active" : ""}`}
          aria-current={active === "profile" ? "page" : undefined}
        >
          <UserRound size={16} />
          Dados do perfil
        </Link>
        <Link
          to="/wallets"
          className={`profile-link ${active === "wallets" ? "profile-link-active" : ""}`}
          aria-current={active === "wallets" ? "page" : undefined}
        >
          <MapPin size={16} />
          Carteiras
        </Link>
        <div className="profile-link" aria-disabled="true">
          <ShoppingCart size={16} />
          Atividade
        </div>
        <div className="profile-link" aria-disabled="true">
          <Heart size={16} />
          Lista de interesse
        </div>
        <div className="profile-link" aria-disabled="true">
          <BadgeCheck size={16} />
          Ofertas
        </div>
        <div className="profile-link" aria-disabled="true">
          <Download size={16} />
          Arquivos baixados
        </div>
        <div className="profile-link" aria-disabled="true">
          <TriangleAlert size={16} />
          Suporte
        </div>
        <Button
          type="button"
          variant="ghost"
          className="profile-link mt-2 min-h-9 w-full justify-start rounded-none border-t border-line p-0 pt-2 font-normal text-amber hover:bg-transparent"
          disabled={logoutPending}
          onClick={onLogout}
        >
          <LogOut size={16} />
          Sair
        </Button>
      </nav>
    </aside>
  );
}

export function RequiredMark() {
  return (
    <span className="text-orange-400" aria-hidden="true">
      *
    </span>
  );
}

export function ProfileField<T extends FieldValues>({
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
      <label className="mb-2 block" htmlFor={`profile-field-${name}`}>
        {label} <RequiredMark />
      </label>
      <Input
        id={`profile-field-${name}`}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `profile-error-${name}` : undefined}
        className={inputClassName}
        {...form.register(name)}
      />
      {error && (
        <p id={`profile-error-${name}`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function ProfilePasswordField({
  form,
  name,
  label,
  visible,
  onToggle,
}: {
  form: UseFormReturn<ProfileFields>;
  name: "currentPassword" | "newPassword" | "confirmPassword";
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block" htmlFor={`field-${name}`}>
        {label}
      </label>
      <div className="relative">
        <Input
          id={`field-${name}`}
          type={visible ? "text" : "password"}
          className="h-8 pr-10"
          {...form.register(name)}
        />
        <button
          type="button"
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-amber"
          onClick={onToggle}
        >
          {visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: user, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
  });
  const [notice, setNotice] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const form = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          ...user,
          walletAlias: user.walletAlias ?? "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }
      : undefined,
  });
  const ens = useWatch({ control: form.control, name: "ens" });
  const mutation = useMutation({
    mutationFn: (values: ProfileFields) => {
      const { currentPassword, newPassword, confirmPassword, ...profile } = values;
      return api.updateProfile({
        ...profile,
        ...(currentPassword ? { currentPassword } : {}),
        ...(newPassword ? { newPassword, confirmPassword } : {}),
        avatarUrl: avatarUrl ?? user?.avatarUrl,
      });
    },
    onSuccess: async () => {
      setNotice("Perfil atualizado.");
      await client.invalidateQueries({ queryKey: ["session"] });
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
    if (!isLoading && !user)
      void navigate({ to: "/login", search: { next: "/profile" } });
  }, [isLoading, navigate, user]);
  if (isLoading || !user) return <PageLoader />;
  const displayedAvatar = avatarUrl ?? user.avatarUrl ?? "";

  return (
    <section className="relative mx-auto grid w-full max-w-300 grid-cols-1 gap-5 px-5 py-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-[23px] lg:px-0">
      <ProfileMenu
        active="profile"
        logoutPending={logout.isPending}
        onLogout={() => logout.mutate()}
      />
      <div className="min-w-0 w-full lg:max-w-[1200px]">
        <h2 className="mb-5 text-lg font-bold">Perfil do colecionador</h2>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="grid gap-x-5 gap-y-5 sm:grid-cols-2"
        >
          <ProfileField
            form={form}
            name="displayName"
            label="Nome de exibição"
            inputClassName="h-8"
          />
          <ProfileField
            form={form}
            name="username"
            label="Nome de usuário"
            inputClassName="h-8"
          />
          <ProfileField
            form={form}
            name="email"
            label="E-mail"
            type="email"
            inputClassName="h-8"
          />
          <div>
            <label className="mb-2 block">
              Nome ENS <RequiredMark />
            </label>
            <div className="flex gap-2">
              <Select value=".eth" disabled>
                <SelectTrigger
                  aria-label="Domínio ENS"
                  className="h-9 w-[76px] shrink-0 px-2"
                >
                  <span>.eth</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".eth">.eth</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Nome ENS"
                className="h-8"
                value={(ens ?? "").replace(/\.eth$/, "")}
                onChange={(event) => {
                  const name = event.target.value.trim();
                  form.setValue("ens", name ? `${name}.eth` : "");
                }}
              />
            </div>
          </div>
          <ProfileField
            form={form}
            name="walletAlias"
            label="Apelido da carteira"
            inputClassName="h-8"
          />
          <div>
            <label className="mb-2 block">Avatar</label>
            <div className="flex h-9 items-center gap-3">
              <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-panel text-copper">
                {displayedAvatar ? (
                  <img
                    src={displayedAvatar}
                    alt="Avatar do colecionador"
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound size={20} />
                )}
              </div>
              <label className="cursor-pointer">
                <Button
                  asChild
                  type="button"
                  className="w-[98px] h-[40px] min-h-0 px-4 font-bold text-[14px] leading-[16px] tracking-normal"
                >
                  <span>Alterar</span>
                </Button>
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  aria-label="Alterar avatar"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_000_000) {
                      setNotice("Escolha uma imagem de até 1 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string")
                        setAvatarUrl(reader.result);
                    };
                    reader.onerror = () =>
                      setNotice("Não foi possível carregar o avatar.");
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {displayedAvatar && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setAvatarUrl("")}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <h3 className="mb-4 mt-1 font-bold">Alterar senha</h3>
            <div className="max-w-[334px] space-y-4">
              <ProfilePasswordField
                form={form}
                name="currentPassword"
                label="Senha atual"
                visible={passwordVisibility.currentPassword}
                onToggle={() =>
                  setPasswordVisibility((current) => ({
                    ...current,
                    currentPassword: !current.currentPassword,
                  }))
                }
              />
              <ProfilePasswordField
                form={form}
                name="newPassword"
                label="Nova senha"
                visible={passwordVisibility.newPassword}
                onToggle={() =>
                  setPasswordVisibility((current) => ({
                    ...current,
                    newPassword: !current.newPassword,
                  }))
                }
              />
              <ProfilePasswordField
                form={form}
                name="confirmPassword"
                label="Confirmar nova senha"
                visible={passwordVisibility.confirmPassword}
                onToggle={() =>
                  setPasswordVisibility((current) => ({
                    ...current,
                    confirmPassword: !current.confirmPassword,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <Button
              type="submit"
              className="w-[131px] h-[40px] min-h-0 px-5 font-bold text-[14px] leading-[16px] tracking-normal"
            >
              Salvar
            </Button>
            <span role="status" className="text-sm text-amber">
              {notice}
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}
