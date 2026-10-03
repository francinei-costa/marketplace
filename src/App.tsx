import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
import { useMarketplaceRealtime } from "./hooks/use-marketplace-realtime";
import { CartPage } from "./components/cart/cart-page";
import { MobileNavigation } from "./components/layout/mobile-navigation";
import { SiteFooter } from "./components/layout/site-footer";
import { SiteHeader } from "./components/layout/site-header";
import { createCatalogRoute, stringifySearch } from "./routes/catalog";
import { createDetailRoute } from "./routes/detail";
import { createCheckoutRoute } from "./routes/checkout";
import { createLoginRoute, createRegisterRoute } from "./routes/auth";
import { createOrderRoute } from "./routes/order";
import { createProfileRoute } from "./routes/profile";
import { createWalletsRoute } from "./routes/wallets";

const rootRoute = createRootRoute({ component: RootLayout });
const catalogRoute = createCatalogRoute(() => rootRoute);
const detailRoute = createDetailRoute(() => rootRoute);
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: CartPage,
});
const checkoutRoute = createCheckoutRoute(() => rootRoute);
const loginRoute = createLoginRoute(() => rootRoute);
const registerRoute = createRegisterRoute(() => rootRoute);
const orderRoute = createOrderRoute(() => rootRoute);
const profileRoute = createProfileRoute(() => rootRoute);
const walletsRoute = createWalletsRoute(() => rootRoute);

const router = createRouter({
  routeTree: rootRoute.addChildren([
    catalogRoute,
    detailRoute,
    cartRoute,
    checkoutRoute,
    loginRoute,
    registerRoute,
    orderRoute,
    profileRoute,
    walletsRoute,
  ]),
  defaultPreload: "intent",
  scrollRestoration: true,
  stringifySearch,
});

function RootLayout() {
  useMarketplaceRealtime();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isolatedFrame =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/order/");
  const profileFrame = pathname === "/profile" || pathname === "/wallets";
  const showFooter =
    !isolatedFrame && pathname !== "/profile" && pathname !== "/wallets";
  return (
    <div className="min-h-screen bg-black">
      <div
        className={
          isolatedFrame
            ? "min-h-screen w-full bg-ink"
            : `mx-auto min-h-screen w-full max-w-360 bg-ink px-5 ${profileFrame ? "" : "py-6"} xl:px-30`
        }
      >
        {!isolatedFrame && <SiteHeader />}
        <main
          className={
            isolatedFrame ? "min-h-screen" : "min-h-[45vh] pb-24 md:pb-0"
          }
        >
          <Outlet />
        </main>
        {showFooter && <SiteFooter />}
        {!isolatedFrame && pathname === "/" && <MobileNavigation />}
      </div>
    </div>
  );
}

export function App() {
  return <RouterProvider router={router} />;
}
