"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
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
  const [confirming, setConfirming] = useState<FormValues | null>(null);

  const schema = useMemo(() => buildSchema(run), [run]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      respondentName: "",
      respondentEmail: "",
      size: "",
      jerseyName: "",
      jerseyNumber: "",
      rosterSelection: "",
      customAnswers: Object.fromEntries(
        run.customQuestions.map((q) => [q.id, ""]),
      ),
    },
  });

  async function actuallySubmit(values: FormValues) {
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
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  async function onSubmit(values: FormValues) {
    if (hasBlankNameOrNumber(values, run)) {
      setConfirming(values);
      return;
    }
    await actuallySubmit(values);
  }

  if (submitted) return <SuccessState teamName={teamName} />;

  const isSubmitting = form.formState.isSubmitting;
  const customAnswersError = form.formState.errors.customAnswers?.message;

  return (
    <>
      <Header teamName={teamName} captainName={captainName} run={run} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-8 space-y-8"
          aria-busy={isSubmitting}
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
                    className="flex flex-wrap gap-2"
                  >
                    {run.sizeOptions.map((size) => (
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </Form>

      <BlankNameNumberDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        onConfirm={() => {
          const values = confirming;
          setConfirming(null);
          if (values) void actuallySubmit(values);
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
