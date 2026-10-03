import { zodResolver } from "@hookform/resolvers/zod";
import {
  createRoute,
  Link,
  useNavigate,
  type AnyRoute,
} from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api";
import {
  AuthFrame,
  SocialButton,
  SocialDivider,
} from "../components/auth/auth-elements";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { errorMessage } from "../lib/error-message";

function validateReturnSearch(search: Record<string, unknown>) {
  const next = typeof search.next === "string" ? search.next : "/";
  const isNftRoute = /^\/nft\/[a-z0-9-]+$/.test(next);
  const isOrderRoute = /^\/order\/[a-zA-Z0-9-]+$/.test(next);
  const allowed = ["/", "/cart", "/checkout", "/profile", "/wallets"];
  return {
    next: allowed.includes(next) || isNftRoute || isOrderRoute ? next : "/",
  };
}

export function createLoginRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  function LoginPage() {
    const { next } = loginRoute.useSearch();
    const navigate = useNavigate();
    const client = useQueryClient();
    const returnToNft = /^\/nft\/([a-z0-9-]+)$/.exec(next);
    const returnToOrder = /^\/order\/([a-zA-Z0-9-]+)$/.exec(next);
    const [notice, setNotice] = useState("");
    const form = useForm({
      resolver: zodResolver(
        z.object({
          email: z.string().email("Informe um e-mail válido."),
          password: z
            .string()
            .min(8, "A senha deve ter ao menos 8 caracteres."),
        }),
      ),
      defaultValues: { email: "", password: "" },
    });
    const mutation = useMutation({
      mutationFn: ({ email, password }: { email: string; password: string }) =>
        api.login(email, password),
      onSuccess: async (user) => {
        client.clear();
        client.setQueryData(["session"], user);
        if (returnToNft) {
          void navigate({
            to: "/nft/$nftId",
            params: { nftId: returnToNft[1] },
          });
        } else if (returnToOrder) {
          void navigate({
            to: "/order/$orderId",
            params: { orderId: returnToOrder[1] },
          });
        } else {
          void navigate({
            to: next as "/" | "/cart" | "/checkout" | "/profile" | "/wallets",
          });
        }
      },
      onError: (error) => setNotice(errorMessage(error)),
    });

    return (
      <AuthFrame>
        <div className="mb-12 text-center text-3xl font-black tracking-[0.14em]">
          KURIO
        </div>
        <h1 className="mb-8 text-center text-xl font-bold">Entrar</h1>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Input
            aria-label="E-mail"
            type="email"
            placeholder="contato@email.com"
            {...form.register("email")}
          />
          <Input
            aria-label="Senha"
            type="password"
            placeholder="Senha"
            {...form.register("password")}
          />
          {Object.values(form.formState.errors).map((error) => (
            <p key={error.message} className="text-xs text-red-400">
              {error.message}
            </p>
          ))}
          <p className="text-right">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-0 h-auto p-0 font-normal text-muted"
              disabled
            >
              Esqueceu a senha?
            </Button>
          </p>
          <p className="text-sm text-red-300" role="alert">
            {notice}
          </p>
          <Button className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <SocialDivider />
        <SocialButton provider="Google" />
        <SocialButton provider="Facebook" />
        <p className="mt-8 text-center text-sm text-sand">
          Novo na Kurio?{" "}
          <Link to="/register" search={{ next }} className="text-amber">
            Crie uma conta
          </Link>
        </p>
        <p className="mt-5 text-center text-xs text-muted">
          Demonstração: luna@kurio.art · senha Kurio2026!
        </p>
      </AuthFrame>
    );
  }

  const loginRoute = createRoute({
    getParentRoute,
    path: "/login",
    validateSearch: validateReturnSearch,
    component: LoginPage,
  });
  return loginRoute;
}

export function createRegisterRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  function RegisterPage() {
    const { next } = registerRoute.useSearch();
    const navigate = useNavigate();
    const client = useQueryClient();
    const returnToNft = /^\/nft\/([a-z0-9-]+)$/.exec(next);
    const returnToOrder = /^\/order\/([a-zA-Z0-9-]+)$/.exec(next);
    const [notice, setNotice] = useState("");
    const form = useForm({
      resolver: zodResolver(
        z
          .object({
            username: z.string().min(3, "Use ao menos 3 caracteres."),
            email: z.string().email("Informe um e-mail válido."),
            password: z.string().min(8, "Use ao menos 8 caracteres."),
            confirm: z.string().min(1, "Confirme sua senha."),
          })
          .refine((values) => values.password === values.confirm, {
            message: "As senhas não coincidem.",
            path: ["confirm"],
          }),
      ),
      defaultValues: { username: "", email: "", password: "", confirm: "" },
    });
    const mutation = useMutation({
      mutationFn: (values: {
        username: string;
        email: string;
        password: string;
        confirm: string;
      }) => api.register(values.username, values.email, values.password),
      onSuccess: async (user) => {
        client.clear();
        client.setQueryData(["session"], user);
        if (returnToNft) {
          void navigate({
            to: "/nft/$nftId",
            params: { nftId: returnToNft[1] },
          });
        } else if (returnToOrder) {
          void navigate({
            to: "/order/$orderId",
            params: { orderId: returnToOrder[1] },
          });
        } else if (next === "/") {
          void navigate({ to: "/profile" });
        } else {
          void navigate({
            to: next as "/" | "/cart" | "/checkout" | "/profile" | "/wallets",
          });
        }
      },
      onError: (error) => setNotice(errorMessage(error)),
    });

    return (
      <AuthFrame>
        <div className="mb-12 text-center text-3xl font-black tracking-[0.14em]">
          KURIO
        </div>
        <h1 className="mb-8 text-center text-xl font-bold">
          Criar perfil de colecionador
        </h1>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Input
            aria-label="Nome de usuário"
            placeholder="Nome de usuário"
            {...form.register("username")}
          />
          <Input
            aria-label="E-mail"
            type="email"
            placeholder="Digite seu e-mail"
            {...form.register("email")}
          />
          <Input
            aria-label="Senha"
            type="password"
            placeholder="Senha"
            {...form.register("password")}
          />
          <Input
            aria-label="Confirmar senha"
            type="password"
            placeholder="Confirmar senha"
            {...form.register("confirm")}
          />
          {Object.values(form.formState.errors).map((error) => (
            <p key={error.message} className="text-xs text-red-400">
              {error.message}
            </p>
          ))}
          <p className="text-sm text-red-300" role="alert">
            {notice}
          </p>
          <Button className="mt-4 w-full" disabled={mutation.isPending}>
            Criar perfil
          </Button>
        </form>
        <SocialDivider />
        <SocialButton provider="Google" />
        <SocialButton provider="Facebook" />
        <p className="mt-8 text-center text-sm text-sand">
          Já tem uma conta?{" "}
          <Link to="/login" search={{ next }} className="text-amber">
            Entre
          </Link>
        </p>
      </AuthFrame>
    );
  }

  const registerRoute = createRoute({
    getParentRoute,
    path: "/register",
    validateSearch: validateReturnSearch,
    component: RegisterPage,
  });
  return registerRoute;
}
