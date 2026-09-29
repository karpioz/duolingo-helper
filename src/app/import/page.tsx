import type { Metadata } from "next";
import { ImportReceiver } from "./import-receiver";

export const metadata: Metadata = { title: "Import · Duolingo Helper" };

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Import from Duolingo</h1>
      <ImportReceiver />
    </main>
  );
}
