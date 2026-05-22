"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  EMPTY_ORDER,
  JERSEY_STYLE_MAX_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  NECKLINES,
  SLEEVE_STYLES,
  SPORT_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  toOrderPayload,
  validateOrder,
  type OrderErrors,
  type OrderInput,
} from "@/lib/order";

type Status = "editing" | "submitting" | "error";

export function OrderForm() {
  const router = useRouter();
  const createOrder = useMutation(api.orders.createOrder);
  const designs = useQuery(api.designs.listMyDesigns);

  const [values, setValues] = useState<OrderInput>(EMPTY_ORDER);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const designsLoaded = designs !== undefined;
  const linkedDesignSet = useMemo(
    () => new Set(values.designIds),
    [values.designIds],
  );

  function update<K extends keyof OrderInput>(key: K, value: OrderInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleDesign(designId: Id<"designs">) {
    const id = designId as unknown as string;
    setValues((prev) => {
      const nextIds = prev.designIds.includes(id)
        ? prev.designIds.filter((d) => d !== id)
        : [...prev.designIds, id];
      return { ...prev, designIds: nextIds };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateOrder(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>(
        '[data-order-error="true"]',
      );
      first?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError(null);
    try {
      const payload = toOrderPayload(values);
      const orderId = await createOrder({
        teamName: payload.teamName,
        sport: payload.sport,
        estimatedQuantity: payload.estimatedQuantity,
        jerseyStyle: payload.jerseyStyle,
        neckline: payload.neckline,
        sleeveStyle: payload.sleeveStyle,
        hasOwnDesign: payload.hasOwnDesign,
        designIds: payload.designIds as unknown as Id<"designs">[],
      });
      router.push(`/portal/orders/${orderId}`);
    } catch (err) {
      setStatus("error");
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving your order.",
      );
    }
  }

  const isBusy = status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-10"
      aria-busy={isBusy}
    >
      <FieldSection
        eyebrow="01"
        title="Team & order"
        description="The basics so we know who this is for and how many to make."
      >
        <TextField
          label="Team name"
          placeholder="Westside FC"
          value={values.teamName}
          onChange={(v) => update("teamName", v)}
          error={errors.teamName}
          maxLength={TEAM_NAME_MAX_LENGTH}
          required
        />
        <TextField
          label="Sport or activity"
          placeholder="Ultimate frisbee, hockey, rugby…"
          value={values.sport}
          onChange={(v) => update("sport", v)}
          error={errors.sport}
          maxLength={SPORT_MAX_LENGTH}
          required
        />
        <NumberField
          label="Estimated quantity"
          placeholder="12"
          helper={`${MIN_QUANTITY} jersey minimum`}
          value={values.estimatedQuantity}
          onChange={(v) => update("estimatedQuantity", v)}
          error={errors.estimatedQuantity}
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          required
        />
      </FieldSection>

      <FieldSection
        eyebrow="02"
        title="Jersey specs"
        description="Pick the silhouette — fine details get nailed down during design review."
      >
        <TextField
          label="Jersey style"
          placeholder="e.g., Ultimate Frisbee jersey, Hockey jersey"
          value={values.jerseyStyle}
          onChange={(v) => update("jerseyStyle", v)}
          error={errors.jerseyStyle}
          maxLength={JERSEY_STYLE_MAX_LENGTH}
          required
        />
        <SegmentedField
          label="Neckline"
          name="neckline"
          options={NECKLINES}
          value={values.neckline}
          onChange={(v) => update("neckline", v)}
          error={errors.neckline}
        />
        <SegmentedField
          label="Sleeve style"
          name="sleeveStyle"
          options={SLEEVE_STYLES}
          value={values.sleeveStyle}
          onChange={(v) => update("sleeveStyle", v)}
          error={errors.sleeveStyle}
        />
        <CheckboxField
          label="I already have my own design"
          helper="Check this if you'll provide the artwork yourself — otherwise leave it unchecked and we'll work with you on a design."
          checked={values.hasOwnDesign}
          onChange={(v) => update("hasOwnDesign", v)}
        />
      </FieldSection>

      <FieldSection
        eyebrow="03"
        title="Link designs"
        description="Attach any briefs you've already uploaded so Sidestep starts with your vibe in mind."
      >
        {!designsLoaded ? (
          <DesignListSkeleton />
        ) : designs.length === 0 ? (
          <EmptyDesigns />
        ) : (
          <DesignChecklist
            designs={designs}
            selected={linkedDesignSet}
            onToggle={toggleDesign}
          />
        )}
      </FieldSection>

      <div className="flex flex-col items-stretch gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          You can update specs and link more designs later from the order page.
        </p>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Saving…" : "Create order"}
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

function DesignChecklist({
  designs,
  selected,
  onToggle,
}: {
  designs: Array<Doc<"designs">>;
  selected: Set<string>;
  onToggle: (id: Id<"designs">) => void;
}) {
  return (
    <ul className="space-y-2" aria-label="Your designs">
      {designs.map((design) => {
        const id = design._id as unknown as string;
        const isSelected = selected.has(id);
        const fileCount = design.fileIds.length;
        return (
          <li key={design._id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-4 py-3 transition ${
                isSelected
                  ? "border-teal-500 ring-2 ring-teal-500/20"
                  : "border-zinc-200 hover:border-teal-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(design._id)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-900">
                  {design.title}
                </span>
                <span className="text-xs text-zinc-500">
                  {fileCount === 0
                    ? "No files yet"
                    : `${fileCount} file${fileCount === 1 ? "" : "s"}`}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyDesigns() {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-600">
      No designs yet — you can add one after creating this order.
    </p>
  );
}

function DesignListSkeleton() {
  return (
    <ul className="space-y-2" aria-label="Loading">
      {[0, 1].map((i) => (
        <li
          key={i}
          className="h-14 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100"
        />
      ))}
    </ul>
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
        data-order-error={error ? "true" : undefined}
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
  min,
  max,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  min: number;
  max: number;
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
        max={max}
        step={1}
        value={typeof value === "number" ? value : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-order-error={error ? "true" : undefined}
        className={inputClass(!!error)}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function SegmentedField({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<string>;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const groupId = useId();
  const errorId = `${groupId}-err`;
  return (
    <div>
      <FieldLabel htmlFor={groupId} required>
        {label}
      </FieldLabel>
      <div
        id={groupId}
        role="radiogroup"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="grid grid-cols-2 gap-2"
      >
        {options.map((option, idx) => {
          const isSelected = value === option;
          const isFirstUnselected = !value && idx === 0;
          return (
            <label
              key={option}
              className={`cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium transition ${
                isSelected
                  ? "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-300"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={isSelected}
                onChange={() => onChange(option)}
                className="sr-only"
                // Focus the first radio when validation routes focus here.
                data-order-error={
                  error && isFirstUnselected ? "true" : undefined
                }
              />
              {option}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function CheckboxField({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-900">{label}</span>
        {helper && (
          <span className="mt-1 block text-xs text-zinc-500">{helper}</span>
        )}
      </span>
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
