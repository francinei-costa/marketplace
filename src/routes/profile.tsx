import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { ProfilePage } from "../components/profile/profile-page";

export function createProfileRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  return createRoute({
    getParentRoute,
    path: "/profile",
    component: ProfilePage,
  });
}
