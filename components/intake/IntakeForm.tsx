"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BRIEF_MAX_LENGTH,
  EMPTY_INTAKE,
  MIN_QUANTITY,
  QUESTIONS_MAX_LENGTH,
  toIntakePayload,
  validateIntake,
  type IntakeErrors,
  type IntakeInput,
} from "@/lib/intake";

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Status = "editing" | "submitting" | "submitted" | "error";

const designOptions: Array<{
  value: "own-design" | "needs-help" | "undecided";
  label: string;
  hint: string;
}> = [
  {
    value: "own-design",
    label: "I have my own design",
    hint: "Upload comes later — we just need to know.",
  },
  {
    value: "needs-help",
    label: "I need help designing",
    hint: "We'll work with you from a brief or mood board.",
  },
  {
    value: "undecided",
    label: "Still figuring it out",
    hint: "That's fine — we'll talk it through.",
  },
];

const usageOptions: Array<{
  value: "event" | "league";
  label: string;
  hint: string;
}> = [
  {
    value: "event",
    label: "One-time event",
    hint: "Tournament, charity match, jam, etc.",
  },
  {
    value: "league",
    label: "Ongoing league or season",
    hint: "Recurring schedule across weeks or months.",
  },
];

export function IntakeForm() {
  const submitIntake = useMutation(api.intakes.submitIntake);
  const [values, setValues] = useState<IntakeInput>(EMPTY_INTAKE);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateIntake(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>('[data-intake-error="true"]');
      first?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError(null);
    try {
      await submitIntake(toIntakePayload(values));
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

  if (status === "submitted") {
    return <SuccessState />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-12"
      aria-busy={status === "submitting"}
    >
      <FieldSection
        eyebrow="01"
        title="About you"
        description="So we know how to reach you."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Your name"
            value={values.name}
            onChange={(v) => update("name", v)}
            error={errors.name}
            autoComplete="name"
            required
          />
          <TextField
            label="Team or organization"
            placeholder="Sidestep Sports"
            value={values.teamName}
            onChange={(v) => update("teamName", v)}
            error={errors.teamName}
            autoComplete="organization"
            required
          />
          <TextField
            label="Email"
            type="email"
            placeholder="you@team.com"
            value={values.email}
            onChange={(v) => update("email", v)}
            error={errors.email}
            autoComplete="email"
            required
          />
          <TextField
            label="Phone"
            type="tel"
            helper="Optional"
            placeholder="604 555 0144"
            value={values.phone}
            onChange={(v) => update("phone", v)}
            error={errors.phone}
            autoComplete="tel"
          />
        </div>
      </FieldSection>

      <FieldSection
        eyebrow="02"
        title="Your project"
        description="The basics we need to give you a real quote."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Sport or activity"
            placeholder="Ultimate Frisbee, Hockey, Bowling…"
            value={values.sport}
            onChange={(v) => update("sport", v)}
            error={errors.sport}
            required
          />
          <NumberField
            label="Estimated jersey count"
            placeholder={String(MIN_QUANTITY)}
            helper={`Minimum ${MIN_QUANTITY}`}
            min={MIN_QUANTITY}
            value={values.estimatedQuantity}
            onChange={(v) => update("estimatedQuantity", v)}
            error={errors.estimatedQuantity}
            required
          />
        </div>

        <RadioGroup
          label="Where are you with design?"
          options={designOptions}
          value={values.designPreference}
          onChange={(v) => update("designPreference", v)}
          error={errors.designPreference}
        />

        <CheckboxGroup
          label="What's this for?"
          helper="Pick any that apply"
          options={usageOptions}
          values={values.usageContext}
          onChange={(v) => update("usageContext", v)}
          error={errors.usageContext}
        />

        <DateField
          label="Deadline or key date"
          helper="Optional — when do you need these in hand?"
          value={values.deadline}
          onChange={(v) => update("deadline", v)}
          error={errors.deadline}
          min={todayIso()}
        />
      </FieldSection>

      <FieldSection
        eyebrow="03"
        title="Anything else"
        description="Help us start the conversation off right."
      >
        <TextareaField
          label="Tell us about your team and inspiration"
          placeholder="Theme, history, vibe, colors you love, jerseys you admire…"
          value={values.brief}
          onChange={(v) => update("brief", v)}
          error={errors.brief}
          maxLength={BRIEF_MAX_LENGTH}
          required
          rows={5}
        />
        <TextareaField
          label="Questions or concerns"
          helper="Optional"
          placeholder="Anything you want us to know up front."
          value={values.questions}
          onChange={(v) => update("questions", v)}
          error={errors.questions}
          maxLength={QUESTIONS_MAX_LENGTH}
          rows={3}
        />
        <CheckboxField
          label="Send me occasional updates from Sidestep"
          checked={values.newsletterOptIn}
          onChange={(v) => update("newsletterOptIn", v)}
        />
      </FieldSection>

      <div className="flex flex-col items-stretch gap-3 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          We&apos;ll reply within five business days.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Send my inquiry"}
          <span aria-hidden="true">→</span>
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

function SuccessState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-teal-200 bg-teal-50 p-10 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-zinc-900">
        Thanks — we&apos;ve got it.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-zinc-600">
        We&apos;ll be in touch within one business day with ideas and a quote.
        Keep an eye on your inbox.
      </p>
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
    <section className="grid gap-8 md:grid-cols-[200px_1fr]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Step {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">{title}</h2>
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
  autoComplete?: string;
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
  autoComplete,
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
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-intake-error={error ? "true" : undefined}
        className={inputClass(!!error)}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  helper,
  min = 1,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  min?: number;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} helper={helper}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-intake-error={error ? "true" : undefined}
        className={inputClass(!!error)}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  error,
  required,
  helper,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  helper?: string;
  min?: string;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} helper={helper}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-intake-error={error ? "true" : undefined}
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
        data-intake-error={error ? "true" : undefined}
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

function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: Array<{ value: string; label: string; hint: string }>;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const groupId = useId();
  const errorId = `${groupId}-err`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium text-zinc-800">
        {label} <span aria-hidden="true" className="text-rose-500">*</span>
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {options.map((opt, idx) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-xl border p-4 text-sm transition ${
                selected
                  ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600/30"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name={groupId}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
                data-intake-error={error && idx === 0 ? "true" : undefined}
              />
              <span className="block font-semibold text-zinc-900">
                {opt.label}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">{opt.hint}</span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}

function CheckboxGroup({
  label,
  helper,
  options,
  values,
  onChange,
  error,
}: {
  label: string;
  helper?: string;
  options: Array<{ value: string; label: string; hint: string }>;
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const groupId = useId();
  const errorId = `${groupId}-err`;
  const toggle = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  };
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <div className="flex items-baseline justify-between">
        <legend className="text-sm font-medium text-zinc-800">{label}</legend>
        {helper && <span className="text-xs text-zinc-400">{helper}</span>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((opt, idx) => {
          const selected = values.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-xl border p-4 text-sm transition ${
                selected
                  ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600/30"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(opt.value)}
                className="sr-only"
                data-intake-error={error && idx === 0 ? "true" : undefined}
              />
              <span className="block font-semibold text-zinc-900">
                {opt.label}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">{opt.hint}</span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-zinc-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-600"
      />
      <span>{label}</span>
    </label>
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
          <span aria-hidden="true" className="ml-0.5 text-rose-500">
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
