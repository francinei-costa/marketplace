import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { api } from "../../api";

export function MobileNavigation() {
  const { data: user } = useQuery({ queryKey: ["session"], queryFn: api.session });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center justify-around rounded-t-[26px] border-t border-line bg-panel px-5 md:hidden" aria-label="Navegação mobile">
      <Link to="/" aria-label="Início" className="text-copper"><Sparkles size={20} /></Link>
      <Link to="/cart" aria-label="Carrinho" className="text-sand"><ShoppingCart size={20} /></Link>
      <Link to={user ? "/profile" : "/login"} aria-label="Perfil" className="text-sand"><UserRound size={20} /></Link>
    </nav>
  );
}
