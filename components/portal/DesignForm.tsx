"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BRIEF_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  EMPTY_DESIGN,
  toDesignPayload,
  validateDesign,
  type DesignErrors,
  type DesignInput,
} from "@/lib/design";

type Mode =
  | { kind: "create" }
  | {
      kind: "edit";
      designId: Id<"designs">;
      initialTitle: string;
      initialBrief: string;
      initialCanvaLink: string;
      existingFileCount: number;
    };

type Status = "editing" | "uploading" | "submitting" | "submitted" | "error";

type UploadStatus = "pending" | "uploading" | "done" | "failed";

type PendingUpload = {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
  storageId?: Id<"_storage">;
};

export function DesignForm({ mode = { kind: "create" } }: { mode?: Mode }) {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.designs.generateUploadUrl);
  const createDesign = useMutation(api.designs.createDesign);
  const updateDesign = useMutation(api.designs.updateDesign);

  const initialInput: DesignInput =
    mode.kind === "edit"
      ? {
          title: mode.initialTitle,
          brief: mode.initialBrief,
          canvaLink: mode.initialCanvaLink,
          fileCount: mode.existingFileCount,
        }
      : EMPTY_DESIGN;

  const [values, setValues] = useState<DesignInput>(initialInput);
  const [errors, setErrors] = useState<DesignErrors>({});
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingFileCount =
    mode.kind === "edit" ? mode.existingFileCount : 0;
  const attachedCount = existingFileCount + pending.length;

  function recalcFileCount(nextPending: PendingUpload[]) {
    setValues((prev) => ({
      ...prev,
      fileCount: existingFileCount + nextPending.length,
    }));
    if (errors.fileCount && existingFileCount + nextPending.length > 0) {
      setErrors((prev) => ({ ...prev, fileCount: undefined }));
    }
  }

  function update<K extends keyof DesignInput>(key: K, value: DesignInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onFilesPicked(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    const added: PendingUpload[] = Array.from(picked).map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      file,
      status: "pending",
    }));
    const next = [...pending, ...added];
    setPending(next);
    recalcFileCount(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePending(id: string) {
    const next = pending.filter((p) => p.id !== id);
    setPending(next);
    recalcFileCount(next);
  }

  async function uploadOne(item: PendingUpload): Promise<Id<"_storage">> {
    setPending((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, status: "uploading", error: undefined } : p,
      ),
    );
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": item.file.type || "application/octet-stream",
        },
        body: item.file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      setPending((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: "done", storageId } : p,
        ),
      );
      return storageId;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Try again.";
      setPending((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: "failed", error: message } : p,
        ),
      );
      throw err;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDesign(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>(
        '[data-design-error="true"]',
      );
      first?.focus();
      return;
    }

    setStatus("uploading");
    setSubmitError(null);

    // Upload any pending files that haven't been uploaded yet (including
    // retries of previously-failed ones). Done sequentially so the UI's
    // progress list reads top-to-bottom — Convex storage handles the
    // throughput either way.
    const storageIds: Id<"_storage">[] = [];
    try {
      for (const item of pending) {
        if (item.status === "done" && item.storageId) {
          storageIds.push(item.storageId);
          continue;
        }
        storageIds.push(await uploadOne(item));
      }
    } catch {
      setStatus("error");
      setSubmitError("One or more files failed to upload. Try again.");
      return;
    }

    setStatus("submitting");
    try {
      const payload = toDesignPayload(values);
      if (mode.kind === "edit") {
        await updateDesign({
          designId: mode.designId,
          title: payload.title,
          brief: payload.brief,
          canvaLink: payload.canvaLink,
          addFileIds: storageIds,
        });
        setStatus("submitted");
        router.push(`/portal/designs/${mode.designId}`);
      } else {
        const designId = await createDesign({
          title: payload.title,
          brief: payload.brief,
          canvaLink: payload.canvaLink,
          fileIds: storageIds,
        });
        setStatus("submitted");
        router.push(`/portal/designs/${designId}`);
      }
    } catch (err) {
      setStatus("error");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving your design.",
      );
    }
  }

  const isBusy = status === "uploading" || status === "submitting";
  const submitLabel =
    status === "uploading"
      ? "Uploading files…"
      : status === "submitting"
        ? "Saving…"
        : mode.kind === "edit"
          ? "Save changes"
          : "Save design";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-10" aria-busy={isBusy}>
      <FieldSection
        eyebrow="01"
        title="About this design"
        description="A clear title and brief make it easier for Sidestep to nail your vibe on the first pass."
      >
        <TextField
          label="Title"
          placeholder="Spring 2026 jerseys"
          value={values.title}
          onChange={(v) => update("title", v)}
          error={errors.title}
          maxLength={TITLE_MAX_LENGTH}
          required
        />
        <TextareaField
          label="Brief"
          placeholder="Theme, colors, references, anything we should know."
          value={values.brief}
          onChange={(v) => update("brief", v)}
          error={errors.brief}
          maxLength={BRIEF_MAX_LENGTH}
          rows={6}
          required
        />
        <TextField
          label="Canva share link"
          placeholder="https://www.canva.com/design/…"
          helper="Optional — we'll open it in a new tab when we review."
          type="url"
          value={values.canvaLink}
          onChange={(v) => update("canvaLink", v)}
          error={errors.canvaLink}
        />
      </FieldSection>

      <FieldSection
        eyebrow="02"
        title="Files"
        description="Logos, mood boards, reference photos, sketches — any file type works."
      >
        {mode.kind === "edit" && existingFileCount > 0 && (
          <p className="text-sm text-zinc-600">
            {existingFileCount} file{existingFileCount === 1 ? "" : "s"} already
            attached. Add more below.
          </p>
        )}

        <FileDropzone
          inputRef={fileInputRef}
          onPicked={onFilesPicked}
          disabled={isBusy}
          error={errors.fileCount}
          attachedCount={attachedCount}
        />

        {pending.length > 0 && (
          <ul className="space-y-2" aria-label="Files to upload">
            {pending.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(item.file.size)} ·{" "}
                    <UploadStatusLabel status={item.status} error={item.error} />
                  </p>
                </div>
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => removePending(item.id)}
                    className="text-xs font-medium text-zinc-500 hover:text-rose-600"
                    disabled={isBusy}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </FieldSection>

      <div className="flex flex-col items-stretch gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Your design saves to your portal — Sidestep will see it next time
          they review your account.
        </p>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
          <span aria-hidden>→</span>
        </button>
      </div>

      {status === "error" && submitError && (
        <p role="alert" className="text-sm text-rose-600">
          {submitError}
        </p>
      )}
    </form>
  );
}

function UploadStatusLabel({
  status,
  error,
}: {
  status: UploadStatus;
  error?: string;
}) {
  switch (status) {
    case "pending":
      return <span className="text-zinc-500">Ready to upload</span>;
    case "uploading":
      return <span className="text-teal-700">Uploading…</span>;
    case "done":
      return <span className="text-emerald-700">Uploaded</span>;
    case "failed":
      return (
        <span className="text-rose-600">{error ?? "Upload failed"}</span>
      );
  }
}

function FileDropzone({
  inputRef,
  onPicked,
  disabled,
  error,
  attachedCount,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPicked: (files: FileList | null) => void;
  disabled: boolean;
  error?: string;
  attachedCount: number;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white px-6 py-10 text-center transition ${
          error
            ? "border-rose-300 hover:border-rose-400"
            : "border-zinc-300 hover:border-teal-500"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <svg
          className="h-8 w-8 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4m4-4v12"
          />
        </svg>
        <span className="text-sm font-medium text-zinc-700">
          Click to choose files or drop them here
        </span>
        <span className="text-xs text-zinc-500">
          Any file type. {attachedCount > 0
            ? `${attachedCount} attached.`
            : "Add at least one."}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => onPicked(e.target.files)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-design-error={error ? "true" : undefined}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-[200px_1fr]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Step {eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  helper?: string;
  maxLength?: number;
};

function TextField({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  helper,
  maxLength,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} helper={helper}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-design-error={error ? "true" : undefined}
        className={inputClass(!!error)}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  helper,
  maxLength,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  maxLength: number;
  rows?: number;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  const remaining = maxLength - value.length;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} helper={helper}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-design-error={error ? "true" : undefined}
        className={inputClass(!!error)}
      />
      <div className="mt-1 flex items-center justify-between">
        <FieldError id={errorId} error={error} />
        <p className="ml-auto text-xs text-zinc-400">
          {remaining} characters left
        </p>
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  required,
  helper,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-800">
        {children}
        {required && (
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        )}
      </label>
      {helper && <span className="text-xs text-zinc-400">{helper}</span>}
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-rose-600">
      {error}
    </p>
  );
}

function inputClass(hasError: boolean) {
  const base =
    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2";
  return hasError
    ? `${base} border-rose-400 focus:border-rose-500 focus:ring-rose-500/30`
    : `${base} border-zinc-300 focus:border-teal-600 focus:ring-teal-600/30`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
