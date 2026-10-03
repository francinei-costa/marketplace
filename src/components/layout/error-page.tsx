import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";

export function ErrorPage({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-300 px-5 py-20 text-center">
      <p className="text-lg text-sand">{message}</p>
      <Button asChild className="mt-5">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
