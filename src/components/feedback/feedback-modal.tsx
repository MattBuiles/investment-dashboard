"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal, useToast } from "strata";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  compressImages,
  MAX_INPUT_FILES,
  type CompressedImage,
} from "@/lib/feedback/compress";

export type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  pageUrl: string;
};

const MAX_MESSAGE_CHARS = 2000;

function deriveFilename(compressed: CompressedImage, original: File | undefined, index: number): string {
  const originalName = original?.name?.trim();
  if (originalName && originalName.length > 0) {
    return originalName;
  }
  return `screenshot-${index + 1}.jpg`;
}

function sizeKb(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 10) return `${kb.toFixed(1)} KB`;
  return `${Math.round(kb)} KB`;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function FeedbackModal({ open, onClose, pageUrl }: FeedbackModalProps) {
  const toast = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>("");
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    sessionIdRef.current = newSessionId();
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setEmail(data?.user?.email ?? null);
      } catch {
        if (!cancelled) setEmail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const previouslyOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || previouslyOpen) return;
    // Modal just opened after being closed (or on first mount). Reset stale
    // state from the previous session so we never show leftover content.
    setMessage("");
    setFiles([]);
    setSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  function resetForm() {
    setMessage("");
    setFiles([]);
    setSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    sessionIdRef.current = newSessionId();
  }

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const compressed = await compressImages(files);
      const images = compressed.map((c, i) => ({
        filename: deriveFilename(c, files[i], i),
        contentType: "image/jpeg" as const,
        dataBase64: c.dataBase64,
      }));
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": sessionIdRef.current,
        },
        body: JSON.stringify({ message: trimmed, images, pageUrl }),
      });
      if (res.ok) {
        toast({
          tone: "success",
          message: "¡Gracias! Tu feedback fue enviado.",
        });
        resetForm();
        onClose();
        return;
      }
      if (res.status === 401) {
        toast({ tone: "error", message: "Tu sesión expiró." });
        window.location.href = "/login";
        return;
      }
      if (res.status === 429) {
        toast({ tone: "error", message: "Demasiados envíos. Probá más tarde." });
        return;
      }
      if (res.status === 502) {
        toast({ tone: "error", message: "No se pudo enviar. Reintentá." });
        return;
      }
      toast({ tone: "error", message: "Revisá los datos e intentá de nuevo." });
    } catch (err) {
      const code =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : "";
      let msg = "No se pudo enviar. Reintentá.";
      if (code === "UNSUPPORTED_TYPE") msg = "Formato no soportado. Solo JPG, PNG o WebP.";
      else if (code === "FILE_TOO_LARGE") msg = "Una imagen supera los 5 MB.";
      else if (code === "IMAGE_TOO_LARGE")
        msg = "No se pudo comprimir la imagen. Probá con otra.";
      toast({ tone: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Enviar feedback</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)]"
        data-testid="feedback-identity-chip"
      >
        <span>Enviando como:</span>
        <span className="font-medium text-[var(--foreground)]">
          {email ?? "—"}
        </span>
      </div>

      <div className="relative">
        <textarea
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos qué piensas o reportá un problema"
          maxLength={MAX_MESSAGE_CHARS}
          rows={5}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 pr-16 pb-8 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          aria-label="Mensaje de feedback"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-[var(--muted)]">
          {message.length}/{MAX_MESSAGE_CHARS}
        </span>
      </div>

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const next = Array.from(e.target.files ?? []);
            setFiles((prev) => [...prev, ...next].slice(0, MAX_INPUT_FILES));
          }}
          aria-label="Adjuntar imágenes"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= MAX_INPUT_FILES}
        >
          <ImagePlus className="size-4" />
          Adjuntar capturas (máx. {MAX_INPUT_FILES})
        </Button>

        {files.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {files.map((f, idx) => (
              <li
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
              >
                <span className="truncate font-medium text-[var(--foreground)]">
                  {f.name}
                </span>
                <span className="shrink-0 text-[var(--muted)]">{sizeKb(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  aria-label={`Eliminar ${f.name}`}
                  className="shrink-0 text-[var(--muted)] hover:text-[var(--negative)]"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar feedback"
          )}
        </Button>
      </div>
    </Modal>
  );
}