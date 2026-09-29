import type { Metadata } from "next";
import { signOut } from "../actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not authorized · Duolingo Helper" };

export default function NotAuthorizedPage() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-muted-foreground">This app is private. Your account doesn’t have access.</p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
