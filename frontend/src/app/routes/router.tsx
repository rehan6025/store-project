import { createBrowserRouter } from "react-router";
import { RootLayout } from "../../app/layouts/RootLayout.tsx";

export const router = createBrowserRouter([
  { path: "/", element: <RootLayout /> },
]);
