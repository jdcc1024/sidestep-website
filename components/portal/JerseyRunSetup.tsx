"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EMPTY_JERSEY_RUN,
  MAX_CUSTOM_QUESTIONS,
  QUESTION_LABEL_MAX_LENGTH,
  ROSTER_NAME_MAX_LENGTH,
  ROSTER_NUMBER_MAX_LENGTH,
  SIZE_OPTIONS,
  newQuestionId,
  toJerseyRunPayload,
  validateJerseyRun,
  type CustomQuestion,
  type JerseyRunErrors,
  type JerseyRunInput,
  type NamesMode,
  type RosterEntry,
} from "@/lib/jerseyRun";

type Status = "editing" | "submitting" | "error";

export function JerseyRunSetup({ orderId }: { orderId: Id<"orders"> }) {
  const run = useQuery(api.jerseyRuns.getByOrder, { orderId });

  if (run === undefined) return <Skeleton />;
  if (run === null)
    return (
      <JerseyRunForm
        orderId={orderId}
      />
    );

  return <JerseyRunSummary run={run} orderId={orderId} />;
}

function JerseyRunForm({ orderId }: { orderId: Id<"orders"> }) {
  const createRun = useMutation(api.jerseyRuns.create);

  const [values, setValues] = useState<JerseyRunInput>(EMPTY_JERSEY_RUN);
  const [errors, setErrors] = useState<JerseyRunErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof JerseyRunInput>(
    key: K,
    value: JerseyRunInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleSize(size: string) {
    setValues((prev) => ({
      ...prev,
      sizeOptions: prev.sizeOptions.includes(size)
        ? prev.sizeOptions.filter((s) => s !== size)
        : [...prev.sizeOptions, size],
    }));
    if (errors.sizeOptions)
      setErrors((prev) => ({ ...prev, sizeOptions: undefined }));
  }

  function setNamesMode(mode: NamesMode) {
    setValues((prev) => ({ ...prev, namesMode: mode }));
    if (errors.namesMode)
      setErrors((prev) => ({ ...prev, namesMode: undefined }));
  }

  function addRosterRow() {
    setValues((prev) => ({
      ...prev,
      fixedRoster: [...prev.fixedRoster, { name: "", number: "" }],
    }));
  }

  function updateRosterRow(
    index: number,
    patch: Partial<RosterEntry>,
  ) {
    setValues((prev) => ({
      ...prev,
      fixedRoster: prev.fixedRoster.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
    if (errors.fixedRoster)
      setErrors((prev) => ({ ...prev, fixedRoster: undefined }));
  }

  function removeRosterRow(index: number) {
    setValues((prev) => ({
      ...prev,
      fixedRoster: prev.fixedRoster.filter((_, i) => i !== index),
    }));
  }

  function addQuestion() {
    if (values.customQuestions.length >= MAX_CUSTOM_QUESTIONS) return;
    setValues((prev) => ({
      ...prev,
      customQuestions: [
        ...prev.customQuestions,
        { id: newQuestionId(), label: "" },
      ],
    }));
  }

  function updateQuestion(id: string, patch: Partial<CustomQuestion>) {
    setValues((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      ),
    }));
    if (errors.customQuestions)
      setErrors((prev) => ({ ...prev, customQuestions: undefined }));
  }

  function removeQuestion(id: string) {
    setValues((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((q) => q.id !== id),
    }));
  }

  function moveQuestion(id: string, direction: -1 | 1) {
    setValues((prev) => {
      const index = prev.customQuestions.findIndex((q) => q.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.customQuestions.length)
        return prev;
      const next = [...prev.customQuestions];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, customQuestions: next };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateJerseyRun(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>(
        '[data-run-error="true"]',
      );
      first?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError(null);
    try {
      const payload = toJerseyRunPayload(values);
      await createRun({
        orderId,
        sizeOptions: payload.sizeOptions,
        namesMode: payload.namesMode,
        fixedRoster: payload.fixedRoster,
        customQuestions: payload.customQuestions,
        deadline: payload.deadline,
      });
      // Convex query is reactive — the summary view will swap in
      // automatically once the run document appears.
    } catch (err) {
      setStatus("error");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving your jersey run.",
      );
    }
  }

  const isBusy = status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-8"
      aria-busy={isBusy}
    >
      <Field
        label="Jersey sizes"
        helper="Pick every size your team might need."
        error={errors.sizeOptions}
      >
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size, idx) => {
            const selected = values.sizeOptions.includes(size);
            const isFirstUnselected =
              !values.sizeOptions.length && idx === 0;
            return (
              <label
                key={size}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSize(size)}
                  className="sr-only"
                  data-run-error={
                    errors.sizeOptions && isFirstUnselected ? "true" : undefined
                  }
                />
                {size}
              </label>
            );
          })}
        </div>
      </Field>

      <Field
        label="Names & numbers"
        helper="Choose how each fan picks their name on the form."
        error={errors.namesMode}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeCard
            selected={values.namesMode === "open"}
            isFirstUnselected={!values.namesMode}
            errorPresent={!!errors.namesMode}
            title="Open"
            description="Each fan types their own name and number."
            onSelect={() => setNamesMode("open")}
          />
          <ModeCard
            selected={values.namesMode === "fixed"}
            isFirstUnselected={false}
            errorPresent={false}
            title="Fixed roster"
            description="You pre-define names; fans pick from a list."
            onSelect={() => setNamesMode("fixed")}
          />
        </div>
      </Field>

      {values.namesMode === "fixed" && (
        <Field
          label="Roster"
          helper="Number is optional — leave blank to let the fan fill it in."
          error={errors.fixedRoster}
        >
          <div className="space-y-2">
            {values.fixedRoster.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-4 text-center text-sm text-zinc-500">
                No roster entries yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {values.fixedRoster.map((row, index) => (
                  <li
                    key={index}
                    className="grid grid-cols-[1fr_120px_auto] gap-2"
                  >
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateRosterRow(index, { name: e.target.value })
                      }
                      placeholder="Name"
                      maxLength={ROSTER_NAME_MAX_LENGTH}
                      className={inputClass(!!errors.fixedRoster)}
                      data-run-error={
                        errors.fixedRoster && index === 0 ? "true" : undefined
                      }
                    />
                    <input
                      type="text"
                      value={row.number}
                      onChange={(e) =>
                        updateRosterRow(index, { number: e.target.value })
                      }
                      placeholder="Number"
                      maxLength={ROSTER_NUMBER_MAX_LENGTH}
                      className={inputClass(!!errors.fixedRoster)}
                    />
                    <button
                      type="button"
                      onClick={() => removeRosterRow(index)}
                      className="rounded-lg border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-rose-300 hover:text-rose-600"
                      aria-label={`Remove row ${index + 1}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={addRosterRow}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              + Add roster entry
            </button>
          </div>
        </Field>
      )}

      <Field
        label="Custom questions"
        helper={`Ask up to ${MAX_CUSTOM_QUESTIONS} extra questions (e.g. "How should we deliver?").`}
        error={errors.customQuestions}
      >
        <div className="space-y-2">
          {values.customQuestions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-4 text-center text-sm text-zinc-500">
              No custom questions.
            </p>
          ) : (
            <ul className="space-y-2">
              {values.customQuestions.map((q, index) => (
                <li
                  key={q.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2"
                >
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) =>
                      updateQuestion(q.id, { label: e.target.value })
                    }
                    placeholder="What do you want to ask?"
                    maxLength={QUESTION_LABEL_MAX_LENGTH}
                    className={inputClass(!!errors.customQuestions)}
                    data-run-error={
                      errors.customQuestions && index === 0 ? "true" : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move question ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, 1)}
                    disabled={index === values.customQuestions.length - 1}
                    className="rounded-lg border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move question ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="rounded-lg border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-rose-300 hover:text-rose-600"
                    aria-label={`Remove question ${index + 1}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={addQuestion}
            disabled={values.customQuestions.length >= MAX_CUSTOM_QUESTIONS}
            className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add question
          </button>
        </div>
      </Field>

      <DateField
        label="Deadline"
        helper="Submissions close at the end of this day."
        value={values.deadline}
        onChange={(v) => update("deadline", v)}
        error={errors.deadline}
      />

      <div className="flex flex-col items-stretch gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          You&apos;ll get a shareable link to send to your team.
        </p>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Saving…" : "Create jersey run"}
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

function JerseyRunSummary({
  run,
  orderId,
}: {
  run: {
    _id: Id<"jerseyRuns">;
    sizeOptions: string[];
    namesMode: "open" | "fixed";
    customQuestions: { id: string; label: string }[];
    deadline: number;
    fixedRoster?: { name: string; number?: string }[];
  };
  orderId: Id<"orders">;
}) {
  const shareUrl = useShareUrl(`/run/${run._id}`);
  return (
    <div className="space-y-6">
      <ShareLink url={shareUrl} />

      <Link
        href={`/portal/orders/${orderId}/run/responses`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        View responses →
      </Link>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <SummaryField label="Sizes" value={run.sizeOptions.join(", ")} />
        <SummaryField
          label="Names mode"
          value={run.namesMode === "fixed" ? "Fixed roster" : "Open"}
        />
        <SummaryField
          label="Deadline"
          value={new Date(run.deadline).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
        <SummaryField
          label="Custom questions"
          value={
            run.customQuestions.length === 0
              ? "None"
              : `${run.customQuestions.length} question${
                  run.customQuestions.length === 1 ? "" : "s"
                }`
          }
        />
      </dl>

      {run.namesMode === "fixed" && run.fixedRoster && run.fixedRoster.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Roster
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-800">
            {run.fixedRoster.map((entry, i) => (
              <li key={i}>
                {entry.name}
                {entry.number ? ` · #${entry.number}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {run.customQuestions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Custom questions
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-800">
            {run.customQuestions.map((q) => (
              <li key={q.id}>{q.label}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// Builds the absolute URL on the client only — window is unavailable
// during SSR, and a relative path is meaningless to paste into a chat.
function useShareUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers without the async clipboard API — fall back to
      // a manual select; the user can still copy with Ctrl+C.
      const input = document.getElementById(
        "jersey-run-share-link",
      ) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
        Shareable link
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="jersey-run-share-link"
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  isFirstUnselected,
  errorPresent,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  isFirstUnselected: boolean;
  errorPresent: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-4 text-left transition ${
        selected
          ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20"
          : "border-zinc-200 bg-white hover:border-teal-300"
      }`}
    >
      <input
        type="radio"
        name="namesMode"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
        data-run-error={errorPresent && isFirstUnselected ? "true" : undefined}
      />
      <span className="block text-sm font-semibold text-zinc-900">{title}</span>
      <span className="mt-1 block text-xs text-zinc-600">{description}</span>
    </label>
  );
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        {helper && <span className="text-xs text-zinc-400">{helper}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DateField({
  label,
  helper,
  value,
  onChange,
  error,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-zinc-800">
          {label}
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        </label>
        {helper && <span className="text-xs text-zinc-400">{helper}</span>}
      </div>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(!!error)}
        data-run-error={error ? "true" : undefined}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
      <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

function inputClass(hasError: boolean) {
  const base =
    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2";
  return hasError
    ? `${base} border-rose-400 focus:border-rose-500 focus:ring-rose-500/30`
    : `${base} border-zinc-300 focus:border-teal-600 focus:ring-teal-600/30`;
}
