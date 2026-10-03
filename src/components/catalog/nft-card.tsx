import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Nft } from "../../types";

export function NftCard({
  nft,
  favorite,
}: {
  nft: Nft;
  favorite: boolean;
}) {
  return (
    <article className="group relative min-w-0">
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block">
        <div className="overflow-hidden rounded-xl bg-panel p-2">
          <img
            src={nft.image}
            alt={`Arte de ${nft.name}`}
            className="aspect-square w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        </div>
        <h3 className="mt-3 truncate text-sm">{nft.name}</h3>
        <p className="mt-1 font-bold text-amber">{nft.price} ETH</p>
      </Link>
      {favorite && (
        <span
          className="absolute right-4 top-4 rounded-full bg-ink/75 p-1.5 text-copper"
          aria-label="Favorito"
        >
          <Heart size={14} fill="currentColor" />
        </span>
      )}
    </article>
  );
}
