import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/app/layouts/RootLayout.tsx";
import { LoginPage } from "@/features/auth/pages/LoginPage.tsx";
import { SignupPage } from "@/features/auth/pages/SignupPage.tsx";
import { Dashboard } from "@/features/dashboard/Dashboard.tsx";
import HomePage from "@/pages/HomePage/HomePage.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "dashboard", element: <Dashboard /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
]);
