import { createRoute, type AnyRoute } from "@tanstack/react-router";
import { OrderPage } from "../components/order/order-page";

export function createOrderRoute<TRoute extends AnyRoute>(
  getParentRoute: () => TRoute,
) {
  function OrderRoutePage() {
    const { orderId } = orderRoute.useParams();
    return <OrderPage orderId={orderId} />;
  }

  const orderRoute = createRoute({
    getParentRoute,
    path: "/order/$orderId",
    component: OrderRoutePage,
  });
  return orderRoute;
}
