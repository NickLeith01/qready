"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm text-zinc-600 hover:text-zinc-900"
    >
      ← Back
    </button>
  );
}
