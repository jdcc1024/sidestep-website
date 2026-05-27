"use client";

import { useMemo, useState } from "react";
import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ANSWER_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  JERSEY_NAME_MAX_LENGTH,
  JERSEY_NUMBER_MAX_LENGTH,
  RESPONDENT_NAME_MAX_LENGTH,
  hasBlankNameOrNumber,
  isJerseyRunClosed,
  toResponsePayload,
  type JerseyRunForResponse,
  type JerseyRunResponseInput,
} from "@/lib/jerseyRunResponse";
import { sortSizes } from "@/lib/jerseyRun";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Matches the EMAIL_PATTERN in lib/jerseyRunResponse.ts and convex/jerseyRuns.ts —
// three places need to agree or the server rejects what the client just let through.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // MyResponsesPanel is a sibling so it shows in every post-load state —
  // form, success, and closed — for signed-in visitors with prior entries.
  // It self-hides for anonymous visitors and signed-in first-timers, so
  // the form-only experience is preserved without per-branch branching.
  const panel = (
    <MyResponsesPanel
      jerseyRunId={jerseyRunId}
      customQuestions={run.customQuestions}
    />
  );

  if (isJerseyRunClosed(run)) {
    return (
      <>
        <ClosedState teamName={data.teamName} captainName={data.captainName} />
        {panel}
      </>
    );
  }

  return (
    <>
      <ResponseForm
        jerseyRunId={jerseyRunId}
        run={run}
        teamName={data.teamName}
        captainName={data.captainName}
      />
      {panel}
    </>
  );
}

// Issue 3-08. Renders the signed-in visitor's prior responses for this run
// as a read-only confirmation panel. Returns null for anonymous visitors,
// loading state, and signed-in first-timers so the form-only experience
// stays unchanged — the panel only appears once the visitor has at least
// one entry to confirm. Reactive: refetches after each "Submit and add
// another" submission, so the user watches the panel grow as they go.
function MyResponsesPanel({
  jerseyRunId,
  customQuestions,
}: {
  jerseyRunId: Id<"jerseyRuns">;
  customQuestions: JerseyRunForResponse["customQuestions"];
}) {
  const responses = useQuery(api.jerseyRuns.listMyResponsesForRun, {
    jerseyRunId,
  });

  if (!responses || responses.length === 0) return null;

  const questionLabel = new Map(customQuestions.map((q) => [q.id, q.label]));

  return (
    <section
      aria-labelledby="my-responses-heading"
      className="mt-10 rounded-xl border border-border bg-muted/40 p-6"
    >
      <h2
        id="my-responses-heading"
        className="text-lg font-semibold text-foreground"
      >
        Your responses to this run
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ve recorded {responses.length}{" "}
        {responses.length === 1 ? "submission" : "submissions"} from you.
      </p>
      <ul className="mt-4 space-y-3">
        {responses.map((response) => (
          <li
            key={response._id}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {[response.jerseyName, response.jerseyNumber ? `#${response.jerseyNumber}` : null]
                  .filter(Boolean)
                  .join(" ") || "No name / number"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSubmittedAt(response.submittedAt)}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Size {response.size}
            </p>
            {Object.entries(response.customAnswers).length > 0 && (
              <dl className="mt-3 space-y-1 text-sm">
                {Object.entries(response.customAnswers).map(([id, answer]) => {
                  const label = questionLabel.get(id);
                  if (!label || !answer) return null;
                  return (
                    <div key={id} className="flex gap-2">
                      <dt className="text-muted-foreground">{label}:</dt>
                      <dd className="text-foreground">{answer}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatSubmittedAt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type FormValues = JerseyRunResponseInput;

// Schema depends on the run (sizeOptions list, namesMode branching, custom
// question ids) so we build it once per run via useMemo. Constants reused
// from lib/jerseyRunResponse.ts keep the client and Convex submitResponse
// mutation in agreement on caps and patterns.
function buildSchema(run: JerseyRunForResponse) {
  return z
    .object({
      respondentName: z
        .string()
        .refine((v) => v.trim().length > 0, "Tell us your name.")
        .refine(
          (v) => v.trim().length <= RESPONDENT_NAME_MAX_LENGTH,
          `Keep your name under ${RESPONDENT_NAME_MAX_LENGTH} characters.`,
        ),
      respondentEmail: z
        .string()
        .refine(
          (v) => v.trim().length > 0,
          "We need an email so your captain can reach you.",
        )
        .refine(
          (v) => v.trim().length <= EMAIL_MAX_LENGTH,
          "That email is too long.",
        )
        .refine(
          (v) => EMAIL_PATTERN.test(v.trim()),
          "That doesn't look like an email.",
        ),
      size: z
        .string()
        .min(1, "Pick a size.")
        .refine(
          (v) => run.sizeOptions.includes(v),
          "Pick a size from the list.",
        ),
      jerseyName: z
        .string()
        .max(
          JERSEY_NAME_MAX_LENGTH,
          `Keep the jersey name under ${JERSEY_NAME_MAX_LENGTH} characters.`,
        ),
      jerseyNumber: z
        .string()
        .max(
          JERSEY_NUMBER_MAX_LENGTH,
          `Keep the jersey number under ${JERSEY_NUMBER_MAX_LENGTH} characters.`,
        ),
      rosterSelection: z.string(),
      customAnswers: z.record(z.string(), z.string()),
    })
    .superRefine((data, ctx) => {
      if (run.namesMode === "fixed") {
        const roster = run.fixedRoster ?? [];
        const idx = Number.parseInt(data.rosterSelection, 10);
        if (
          data.rosterSelection.length === 0 ||
          !Number.isInteger(idx) ||
          idx < 0 ||
          idx >= roster.length
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["rosterSelection"],
            message: "Pick your name from the list.",
          });
        }
      }

      // Only inspect answers tied to known question ids — extras are ignored
      // (they could come from a stale form snapshot if the captain edited
      // questions after sharing the link).
      const knownIds = new Set(run.customQuestions.map((q) => q.id));
      for (const id of knownIds) {
        const value = data.customAnswers[id] ?? "";
        if (value.length > ANSWER_MAX_LENGTH) {
          ctx.addIssue({
            code: "custom",
            path: ["customAnswers"],
            message: `Keep each answer under ${ANSWER_MAX_LENGTH} characters.`,
          });
          break;
        }
      }
    });
}

type SubmitMode = "final" | "addAnother";

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
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<
    { values: FormValues; mode: SubmitMode } | null
  >(null);
  // Tracks the mutation independently of RHF's isSubmitting because the
  // blank-name dialog path returns from handleSubmit before firing the
  // mutation — without this flag the buttons would re-enable mid-flight.
  const [pending, setPending] = useState(false);

  const schema = useMemo(() => buildSchema(run), [run]);

  const emptyCustomAnswers = useMemo(
    () => Object.fromEntries(run.customQuestions.map((q) => [q.id, ""])),
    [run.customQuestions],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      respondentName: "",
      respondentEmail: "",
      size: "",
      jerseyName: "",
      jerseyNumber: "",
      rosterSelection: "",
      customAnswers: emptyCustomAnswers,
    },
  });

  async function actuallySubmit(values: FormValues, mode: SubmitMode) {
    setSubmitError(null);
    setPending(true);
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
      if (mode === "final") {
        setSubmitted(true);
      } else {
        toast.success("Response saved", {
          description: buildToastDescription(payload),
        });
        // Keep respondent identity so a parent/captain submitting for
        // several people doesn't retype it; reset only the per-jersey
        // fields. Matches the UX call captured in the issue notes.
        form.reset({
          respondentName: values.respondentName,
          respondentEmail: values.respondentEmail,
          size: "",
          jerseyName: "",
          jerseyNumber: "",
          rosterSelection: "",
          customAnswers: emptyCustomAnswers,
        });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(values: FormValues, event?: BaseSyntheticEvent) {
    // The submitter button carries data-submit-mode so we know which
    // action the user pressed. Reading from the event avoids a render-
    // time ref read and stays in sync with the click that triggered us.
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)
      ?.submitter as HTMLElement | null;
    const mode: SubmitMode =
      submitter?.dataset.submitMode === "addAnother" ? "addAnother" : "final";
    if (hasBlankNameOrNumber(values, run)) {
      setConfirming({ values, mode });
      return;
    }
    await actuallySubmit(values, mode);
  }

  if (submitted) return <SuccessState teamName={teamName} />;

  const busy = pending || form.formState.isSubmitting;
  const customAnswersError = form.formState.errors.customAnswers?.message;

  return (
    <>
      <Header teamName={teamName} captainName={captainName} run={run} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-8 space-y-8"
          aria-busy={busy}
        >
          <FormField
            control={form.control}
            name="respondentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Your name
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    maxLength={RESPONDENT_NAME_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="respondentEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Your email
                  <RequiredMark />
                </FormLabel>
                <FormDescription>
                  So your captain can reach you with updates.
                </FormDescription>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Jersey size
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    className="flex flex-wrap justify-center gap-2"
                  >
                    {sortSizes(run.sizeOptions).map((size) => (
                      <SizeOption key={size} value={size} />
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {run.namesMode === "open" ? (
            <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
              <FormField
                control={form.control}
                name="jerseyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name on jersey</FormLabel>
                    <FormDescription>Leave blank for no name.</FormDescription>
                    <FormControl>
                      <Input maxLength={JERSEY_NAME_MAX_LENGTH} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jerseyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number</FormLabel>
                    <FormDescription>Leave blank for none.</FormDescription>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        maxLength={JERSEY_NUMBER_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <FormField
              control={form.control}
              name="rosterSelection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pick your name
                    <RequiredMark />
                  </FormLabel>
                  <FormDescription>
                    Your captain set the roster in advance.
                  </FormDescription>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your name…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(run.fixedRoster ?? []).map((entry, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {entry.name}
                          {entry.number ? ` · #${entry.number}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {run.customQuestions.length > 0 && (
            <div className="space-y-6">
              {run.customQuestions.map((q) => (
                <FormField
                  key={q.id}
                  control={form.control}
                  name={`customAnswers.${q.id}` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{q.label}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          maxLength={ANSWER_MAX_LENGTH}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
              {customAnswersError && (
                <p
                  role="alert"
                  className="text-[0.8rem] font-medium text-destructive"
                >
                  {String(customAnswersError)}
                </p>
              )}
            </div>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Separator />

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Your captain will see your submission right away.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={busy}
                data-submit-mode="addAnother"
              >
                Submit and add another
              </Button>
              <Button
                type="submit"
                disabled={busy}
                data-submit-mode="final"
              >
                {busy ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <BlankNameNumberDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        onConfirm={() => {
          const pending = confirming;
          setConfirming(null);
          if (pending) void actuallySubmit(pending.values, pending.mode);
        }}
      />
    </>
  );
}

function SizeOption({ value }: { value: string }) {
  return (
    <label className="flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-ring has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/10 has-[[data-checked]]:text-primary">
      <RadioGroupItem value={value} className="sr-only" />
      {value}
    </label>
  );
}

function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-destructive">
      *
    </span>
  );
}

function BlankNameNumberDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave the jersey blank?</DialogTitle>
          <DialogDescription>
            You haven&apos;t filled in your jersey name or number. Your jersey
            will be plain — is that what you want?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Go back</Button>} />
          <Button onClick={onConfirm}>Yes, submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Jersey run
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {teamName || "Your team"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {captainName ? `${captainName} is ordering` : "Your captain is ordering"}{" "}
        custom jerseys. Tell us your size and how you&apos;d like yours.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Submissions close {formatDeadline(run.deadline)}.
      </p>
    </header>
  );
}

function SuccessState({ teamName }: { teamName: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-10 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">You&apos;re in!</h1>
      <p className="mt-2 text-muted-foreground">
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
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Jersey run
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {teamName || "This jersey run"} is closed.
      </h1>
      <p className="mt-3 text-muted-foreground">
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
      <h1 className="text-2xl font-bold text-foreground">
        We couldn&apos;t find that jersey run.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Double-check the link your captain shared with you.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildToastDescription(payload: {
  respondentName: string;
  size: string;
  jerseyName: string | undefined;
  jerseyNumber: string | undefined;
}): string {
  const jersey = [
    payload.jerseyName,
    payload.jerseyNumber ? `#${payload.jerseyNumber}` : null,
    payload.size,
  ]
    .filter(Boolean)
    .join(" · ");
  return jersey.length > 0 ? jersey : payload.respondentName;
}
