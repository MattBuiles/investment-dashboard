"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";

export type FeedbackButtonProps = {
  variant: "sidebar" | "mobile";
};

export function FeedbackButton({ variant }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const pageUrl =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  if (variant === "sidebar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <MessageSquarePlus className="size-4" />
          Feedback
        </button>
        <FeedbackModal open={open} onClose={() => setOpen(false)} pageUrl={pageUrl} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
      >
        <MessageSquarePlus className="size-4" /> Feedback
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} pageUrl={pageUrl} />
    </>
  );
}