import { Outlet, ScrollRestoration } from "react-router";

export const RootLayout = () => {
  return (
    <div>
      <Outlet />
      <ScrollRestoration />
    </div>
  );
};
