import type { ReactNode } from "react";
import { Button } from "../ui/button";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[500px] flex-col justify-center bg-panel px-7 py-10 sm:px-20">
      {children}
    </div>
  );
}

export function SocialDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs">
      <span className="h-px flex-1 bg-line" />
      Ou continue com
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function SocialButton({ provider }: { provider: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="mb-3 w-full border-line text-sand"
      disabled
      title="Autenticação social indisponível nesta demonstração"
    >
      Continuar com {provider}
    </Button>
  );
}
