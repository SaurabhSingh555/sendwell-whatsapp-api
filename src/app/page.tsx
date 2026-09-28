import Console from "@/components/Console";
import { getApiKey } from "@/lib/api-key";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let apiKey: string | null = null;
  let keyError: string | undefined;
  try {
    apiKey = await getApiKey();
  } catch (error) {
    keyError = error instanceof Error ? error.message : "Could not load the API key from Supabase.";
  }
  return <Console apiKey={apiKey} keyError={keyError} />;
}
