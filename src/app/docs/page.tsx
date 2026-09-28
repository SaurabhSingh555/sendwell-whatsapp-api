import ApiDocs from "@/components/ApiDocs";
import { getApiKey } from "@/lib/api-key";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "API Docs — sendwell.",
  description: "WhatsApp Media Sender API examples and reference.",
};

export default async function DocsPage() {
  let key: string | null = null;
  try {
    key = await getApiKey();
  } catch {
    // The documentation remains readable while the database is unavailable.
  }
  return <ApiDocs apiKey={key} />;
}
