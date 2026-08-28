import type { PropsWithChildren } from "react";
import { Renderer } from "../../features/renderer/Renderer";

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <>
      {children}
      <Renderer storeId="store_abc123" slug="/" />
    </>
  );
};
