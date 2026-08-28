import { useStoreSchema } from "./useStoreSchema";
import { PageRenderer } from "./PageRenderer";

interface RendererProps {
  storeId: string;
  slug: string;
}

export function Renderer({ storeId, slug }: RendererProps) {
  const { schema, loading, error } = useStoreSchema(storeId);

  if (loading) {
    return (
      <div>
        <p>Loading store…</p>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div>
        <h1>Something went wrong</h1>
        <p>{error ?? "Store schema could not be loaded."}</p>
      </div>
    );
  }

  return <PageRenderer schema={schema} slug={slug} />;
}
