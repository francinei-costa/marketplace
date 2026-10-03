import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { CheckoutPage } from "../components/checkout/checkout-page";

export function createCheckoutRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  const route = createRoute({
    getParentRoute,
    path: "/checkout",
    component: CheckoutPage,
  });
  return route;
}
