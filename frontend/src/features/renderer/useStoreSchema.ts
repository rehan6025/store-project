import { useEffect, useState } from "react";
import type { StoreSchema } from "./types";

interface UseStoreSchemaResult {
  schema: StoreSchema | null;
  loading: boolean;
  error: string | null;
}

async function fetchSchema(storeId: string): Promise<StoreSchema> {
  const sample = await import("./sample-schema.json");
  const data = sample.default as StoreSchema;

  if (data.storeId !== storeId) {
    console.warn(
      `[renderer] Requested storeId "${storeId}" doesn't match sample data's "${data.storeId}" — using sample anyway (backend not wired up).`,
    );
  }

  return data;
}

export function useStoreSchema(storeId: string): UseStoreSchemaResult {
  const [schema, setSchema] = useState<StoreSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSchema(storeId)
      .then((data) => !cancelled && setSchema(data))
      .catch(
        (err) =>
          !cancelled &&
          setError(
            err instanceof Error ? err.message : "Failed to load store schema",
          ),
      )
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return { schema, loading, error };
}
