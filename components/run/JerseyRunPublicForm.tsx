"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ANSWER_MAX_LENGTH,
  EMPTY_RESPONSE,
  JERSEY_NAME_MAX_LENGTH,
  JERSEY_NUMBER_MAX_LENGTH,
  RESPONDENT_NAME_MAX_LENGTH,
  hasBlankNameOrNumber,
  isJerseyRunClosed,
  toResponsePayload,
  validateResponse,
  type JerseyRunForResponse,
  type JerseyRunResponseErrors,
  type JerseyRunResponseInput,
} from "@/lib/jerseyRunResponse";

type Status = "editing" | "confirming" | "submitting" | "submitted" | "error";

export function JerseyRunPublicForm({
  jerseyRunId,
}: {
  jerseyRunId: Id<"jerseyRuns">;
}) {
  const data = useQuery(api.jerseyRuns.getPublic, { jerseyRunId });

  if (data === undefined) return <Skeleton />;
  if (data === null) return <NotFound />;

  const run: JerseyRunForResponse = {
    namesMode: data.run.namesMode,
    sizeOptions: data.run.sizeOptions,
    customQuestions: data.run.customQuestions,
    fixedRoster: data.run.fixedRoster,
    deadline: data.run.deadline,
    status: data.run.status,
  };

  if (isJerseyRunClosed(run)) {
    return (
      <ClosedState teamName={data.teamName} captainName={data.captainName} />
    );
  }

  return (
    <ResponseForm
      jerseyRunId={jerseyRunId}
      run={run}
      teamName={data.teamName}
      captainName={data.captainName}
    />
  );
}

function ResponseForm({
  jerseyRunId,
  run,
  teamName,
  captainName,
}: {
  jerseyRunId: Id<"jerseyRuns">;
  run: JerseyRunForResponse;
  teamName: string;
  captainName: string;
}) {
  const submitResponse = useMutation(api.jerseyRuns.submitResponse);

  const [values, setValues] = useState<JerseyRunResponseInput>(EMPTY_RESPONSE);
  const [errors, setErrors] = useState<JerseyRunResponseErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof JerseyRunResponseInput>(
    key: K,
    value: JerseyRunResponseInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setAnswer(questionId: string, value: string) {
    setValues((prev) => ({
      ...prev,
      customAnswers: { ...prev.customAnswers, [questionId]: value },
    }));
    if (errors.customAnswers)
      setErrors((prev) => ({ ...prev, customAnswers: undefined }));
  }

  async function actuallySubmit() {
    setStatus("submitting");
    setSubmitError(null);
    try {
      const payload = toResponsePayload(values, run);
      await submitResponse({
        jerseyRunId,
        respondentName: payload.respondentName,
        respondentEmail: payload.respondentEmail,
        size: payload.size,
        jerseyName: payload.jerseyName,
        jerseyNumber: payload.jerseyNumber,
        customAnswers: payload.customAnswers,
      });
      setStatus("submitted");
    } catch (err) {
      setStatus("error");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateResponse(values, run);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>(
        '[data-response-error="true"]',
      );
      first?.focus();
      return;
    }
    if (hasBlankNameOrNumber(values, run)) {
      setStatus("confirming");
      return;
    }
    void actuallySubmit();
  }

  if (status === "submitted") {
    return <SuccessState teamName={teamName} />;
  }

  const isBusy = status === "submitting";

  return (
    <>
      <Header teamName={teamName} captainName={captainName} run={run} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 space-y-8"
        aria-busy={isBusy}
      >
        <Field
          label="Your name"
          error={errors.respondentName}
          required
          render={(id) => (
            <input
              id={id}
              type="text"
              value={values.respondentName}
              onChange={(e) => update("respondentName", e.target.value)}
              maxLength={RESPONDENT_NAME_MAX_LENGTH}
              autoComplete="name"
              className={inputClass(!!errors.respondentName)}
              data-response-error={errors.respondentName ? "true" : undefined}
            />
          )}
        />

        <Field
          label="Your email"
          helper="So your captain can reach you with updates."
          error={errors.respondentEmail}
          required
          render={(id) => (
            <input
              id={id}
              type="email"
              value={values.respondentEmail}
              onChange={(e) => update("respondentEmail", e.target.value)}
              autoComplete="email"
              className={inputClass(!!errors.respondentEmail)}
              data-response-error={errors.respondentEmail ? "true" : undefined}
            />
          )}
        />

        <Field
          label="Jersey size"
          error={errors.size}
          required
          render={() => (
            <div className="flex flex-wrap gap-2">
              {run.sizeOptions.map((size, idx) => {
                const selected = values.size === size;
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
                      type="radio"
                      name="size"
                      checked={selected}
                      onChange={() => update("size", size)}
                      className="sr-only"
                      data-response-error={
                        errors.size && idx === 0 ? "true" : undefined
                      }
                    />
                    {size}
                  </label>
                );
              })}
            </div>
          )}
        />

        {run.namesMode === "open" ? (
          <OpenNameFields
            values={values}
            errors={errors}
            update={update}
          />
        ) : (
          <FixedRosterField
            values={values}
            errors={errors}
            roster={run.fixedRoster ?? []}
            update={update}
          />
        )}

        {run.customQuestions.length > 0 && (
          <div className="space-y-6">
            {run.customQuestions.map((q) => (
              <Field
                key={q.id}
                label={q.label}
                error={undefined}
                render={(id) => (
                  <textarea
                    id={id}
                    value={values.customAnswers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    maxLength={ANSWER_MAX_LENGTH}
                    rows={3}
                    className={inputClass(false)}
                  />
                )}
              />
            ))}
            {errors.customAnswers && (
              <p role="alert" className="text-xs text-rose-600">
                {errors.customAnswers}
              </p>
            )}
          </div>
        )}

        {submitError && (
          <p role="alert" className="text-sm text-rose-600">
            {submitError}
          </p>
        )}

        <div className="flex flex-col items-stretch gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Your captain will see your submission right away.
          </p>
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Submitting…" : "Submit"}
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>

      {status === "confirming" && (
        <BlankNameNumberDialog
          onConfirm={() => void actuallySubmit()}
          onCancel={() => setStatus("editing")}
        />
      )}
    </>
  );
}

function OpenNameFields({
  values,
  errors,
  update,
}: {
  values: JerseyRunResponseInput;
  errors: JerseyRunResponseErrors;
  update: <K extends keyof JerseyRunResponseInput>(
    key: K,
    value: JerseyRunResponseInput[K],
  ) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
      <Field
        label="Name on jersey"
        helper="Leave blank for no name."
        error={errors.jerseyName}
        render={(id) => (
          <input
            id={id}
            type="text"
            value={values.jerseyName}
            onChange={(e) => update("jerseyName", e.target.value)}
            maxLength={JERSEY_NAME_MAX_LENGTH}
            className={inputClass(!!errors.jerseyName)}
            data-response-error={errors.jerseyName ? "true" : undefined}
          />
        )}
      />
      <Field
        label="Number"
        helper="Leave blank for none."
        error={errors.jerseyNumber}
        render={(id) => (
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={values.jerseyNumber}
            onChange={(e) => update("jerseyNumber", e.target.value)}
            maxLength={JERSEY_NUMBER_MAX_LENGTH}
            className={inputClass(!!errors.jerseyNumber)}
            data-response-error={errors.jerseyNumber ? "true" : undefined}
          />
        )}
      />
    </div>
  );
}

function FixedRosterField({
  values,
  errors,
  roster,
  update,
}: {
  values: JerseyRunResponseInput;
  errors: JerseyRunResponseErrors;
  roster: { name: string; number?: string }[];
  update: <K extends keyof JerseyRunResponseInput>(
    key: K,
    value: JerseyRunResponseInput[K],
  ) => void;
}) {
  return (
    <Field
      label="Pick your name"
      helper="Your captain set the roster in advance."
      error={errors.rosterSelection}
      required
      render={(id) => (
        <select
          id={id}
          value={values.rosterSelection}
          onChange={(e) => update("rosterSelection", e.target.value)}
          className={inputClass(!!errors.rosterSelection)}
          data-response-error={errors.rosterSelection ? "true" : undefined}
        >
          <option value="">Select your name…</option>
          {roster.map((entry, idx) => (
            <option key={idx} value={String(idx)}>
              {entry.name}
              {entry.number ? ` · #${entry.number}` : ""}
            </option>
          ))}
        </select>
      )}
    />
  );
}

function BlankNameNumberDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blank-name-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="blank-name-dialog-title"
          className="text-lg font-semibold text-zinc-900"
        >
          Leave the jersey blank?
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          You haven&apos;t filled in your jersey name or number. Your jersey
          will be plain — is that what you want?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Yes, submit
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  teamName,
  captainName,
  run,
}: {
  teamName: string;
  captainName: string;
  run: JerseyRunForResponse;
}) {
  return (
    <header>
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
        Jersey run
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {teamName || "Your team"}
      </h1>
      <p className="mt-3 text-zinc-600">
        {captainName ? `${captainName} is ordering` : "Your captain is ordering"}{" "}
        custom jerseys. Tell us your size and how you&apos;d like yours.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Submissions close {formatDeadline(run.deadline)}.
      </p>
    </header>
  );
}

function SuccessState({ teamName }: { teamName: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900">You&apos;re in!</h1>
      <p className="mt-2 text-zinc-600">
        Your captain at {teamName || "your team"} will be in touch.
      </p>
    </div>
  );
}

function ClosedState({
  teamName,
  captainName,
}: {
  teamName: string;
  captainName: string;
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
        Jersey run
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {teamName || "This jersey run"} is closed.
      </h1>
      <p className="mt-3 text-zinc-600">
        Submissions are no longer being accepted.
        {captainName
          ? ` Reach out to ${captainName} if you think this is a mistake.`
          : ""}
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-zinc-900">
        We couldn&apos;t find that jersey run.
      </h1>
      <p className="mt-2 text-zinc-600">
        Double-check the link your captain shared with you.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="h-32 animate-pulse rounded bg-zinc-100" />
      <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

function Field({
  label,
  helper,
  error,
  required,
  render,
}: {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  render: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-zinc-800">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-rose-500">
              *
            </span>
          )}
        </label>
        {helper && <span className="text-xs text-zinc-400">{helper}</span>}
      </div>
      {render(id)}
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
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

function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
