import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { WalletsPage } from "../components/profile/wallets-page";

export function createWalletsRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  return createRoute({
    getParentRoute,
    path: "/wallets",
    component: WalletsPage,
  });
}
