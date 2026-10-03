import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { Nft } from "../types";

type NftUpdate = {
  id: string;
  price: string;
  available: number;
  version: number;
};

export function useMarketplaceRealtime() {
  const client = useQueryClient();
  const seenVersions = useRef(new Map<string, number>());

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });
    socket.on("nft.updated", (event: NftUpdate) => {
      const previous = seenVersions.current.get(event.id) ?? 0;
      if (event.version <= previous) return;
      seenVersions.current.set(event.id, event.version);
      client.setQueriesData<{ items: Nft[]; total: number }>(
        { queryKey: ["catalog"] },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((nft) =>
                  nft.id === event.id
                    ? {
                        ...nft,
                        price: event.price,
                        available: event.available,
                      }
                    : nft,
                ),
              }
            : current,
      );
      client.setQueryData<Nft>(["nft", event.id], (current) =>
        current
          ? { ...current, price: event.price, available: event.available }
          : current,
      );
      void client.invalidateQueries({ queryKey: ["quote"] });
    });
    return () => {
      socket.disconnect();
    };
  }, [client]);
}
