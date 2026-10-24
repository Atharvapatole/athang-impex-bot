"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BusinessDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/businesses");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-xs text-slate-500 animate-pulse">
        Redirecting to ATHANG IMPEX Business Profile...
      </div>
    </div>
  );
}
