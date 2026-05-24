"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  JERSEY_STYLE_MAX_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  NECKLINES,
  SLEEVE_STYLES,
  SPORT_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  toOrderPayload,
  type Neckline,
  type SleeveStyle,
} from "@/lib/order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";

// Colocated zod schema. Field-level rules match the constants and error
// messages in lib/order.ts so client and server (convex/orders.ts) reject
// the same inputs with the same wording. estimatedQuantity stays a string
// so the empty default doesn't immediately read as invalid — refines do
// the numeric work.
const formSchema = z.object({
  teamName: z
    .string()
    .trim()
    .min(1, "Give your team a name.")
    .max(
      TEAM_NAME_MAX_LENGTH,
      `Please keep the team name under ${TEAM_NAME_MAX_LENGTH} characters.`,
    ),
  sport: z
    .string()
    .trim()
    .min(1, "What sport or activity is this for?")
    .max(
      SPORT_MAX_LENGTH,
      `Please keep this under ${SPORT_MAX_LENGTH} characters.`,
    ),
  estimatedQuantity: z
    .string()
    .refine((value) => {
      const n = Number.parseInt(value.trim(), 10);
      return Number.isFinite(n) && n >= MIN_QUANTITY;
    }, `Order at least ${MIN_QUANTITY} jersey.`)
    .refine((value) => {
      const n = Number.parseInt(value.trim(), 10);
      return !Number.isFinite(n) || n <= MAX_QUANTITY;
    }, `That's a lot — please contact us directly for orders over ${MAX_QUANTITY}.`),
  jerseyStyle: z
    .string()
    .trim()
    .min(1, "Tell us the jersey style.")
    .max(
      JERSEY_STYLE_MAX_LENGTH,
      `Please keep this under ${JERSEY_STYLE_MAX_LENGTH} characters.`,
    ),
  neckline: z.enum(NECKLINES, { message: "Pick a neckline." }),
  sleeveStyle: z.enum(SLEEVE_STYLES, { message: "Pick a sleeve style." }),
  hasOwnDesign: z.boolean(),
  designIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function OrderForm() {
  const router = useRouter();
  const createOrder = useMutation(api.orders.createOrder);
  const designs = useQuery(api.designs.listMyDesigns);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: "",
      sport: "",
      estimatedQuantity: "",
      jerseyStyle: "",
      // neckline / sleeveStyle start unselected. zod rejects undefined with
      // the messages above; the cast satisfies the RadioGroup binding.
      neckline: undefined as unknown as Neckline,
      sleeveStyle: undefined as unknown as SleeveStyle,
      hasOwnDesign: false,
      designIds: [],
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = toOrderPayload({
        teamName: values.teamName,
        sport: values.sport,
        estimatedQuantity: values.estimatedQuantity,
        jerseyStyle: values.jerseyStyle,
        neckline: values.neckline,
        sleeveStyle: values.sleeveStyle,
        hasOwnDesign: values.hasOwnDesign,
        designIds: values.designIds,
      });
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
      toast.success("Order created", {
        description: "We'll take it from here — track its progress on the order page.",
      });
      router.push(`/portal/orders/${orderId}`);
    } catch (err) {
      toast.error("Could not save your order", {
        description:
          err instanceof Error
            ? err.message
            : "Please try again in a moment.",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-10"
        aria-busy={isSubmitting}
      >
        <FieldSection
          eyebrow="01"
          title="Team & order"
          description="The basics so we know who this is for and how many to make."
        >
          <FormField
            control={form.control}
            name="teamName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Westside FC"
                    maxLength={TEAM_NAME_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sport or activity</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ultimate frisbee, hockey, rugby…"
                    maxLength={SPORT_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated quantity</FormLabel>
                <FormDescription>
                  {MIN_QUANTITY} jersey minimum.
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_QUANTITY}
                    max={MAX_QUANTITY}
                    step={1}
                    placeholder="12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FieldSection>

        <FieldSection
          eyebrow="02"
          title="Jersey specs"
          description="Pick the silhouette — fine details get nailed down during design review."
        >
          <FormField
            control={form.control}
            name="jerseyStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jersey style</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Ultimate Frisbee jersey, Hockey jersey"
                    maxLength={JERSEY_STYLE_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="neckline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Neckline</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {NECKLINES.map((option) => (
                      <SegmentedOption key={option} value={option} />
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sleeveStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sleeve style</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {SLEEVE_STYLES.map((option) => (
                      <SegmentedOption key={option} value={option} />
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasOwnDesign"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-background px-4 py-3 transition hover:border-ring has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(next) => field.onChange(next === true)}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      I already have my own design
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Check this if you&apos;ll provide the artwork yourself —
                      otherwise leave it unchecked and we&apos;ll work with you
                      on a design.
                    </span>
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        </FieldSection>

        <FieldSection
          eyebrow="03"
          title="Link designs"
          description="Attach any briefs you've already uploaded so Sidestep starts with your vibe in mind."
        >
          <FormField
            control={form.control}
            name="designIds"
            render={({ field }) => (
              <FormItem>
                <DesignChecklist
                  designs={designs}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </FieldSection>

        <Separator />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            You can update specs and link more designs later from the order
            page.
          </p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SegmentedOption({ value }: { value: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-ring has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-checked]]:text-primary">
      <RadioGroupItem value={value} className="sr-only" />
      {value}
    </label>
  );
}

function DesignChecklist({
  designs,
  value,
  onChange,
}: {
  designs: Array<Doc<"designs">> | undefined;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = useMemo(() => new Set(value), [value]);

  if (designs === undefined) return <DesignListSkeleton />;
  if (designs.length === 0) return <EmptyDesigns />;

  function toggle(id: string, checked: boolean) {
    onChange(
      checked
        ? Array.from(new Set([...value, id]))
        : value.filter((existing) => existing !== id),
    );
  }

  return (
    <ul className="space-y-2" aria-label="Your designs">
      {designs.map((design) => {
        const id = design._id as unknown as string;
        const isSelected = selected.has(id);
        const fileCount = design.fileIds.length;
        return (
          <li key={design._id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-background px-4 py-3 transition hover:border-ring has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(next) => toggle(id, next === true)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {design.title}
                </span>
                <span className="text-xs text-muted-foreground">
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
    <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
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
          className="h-14 animate-pulse rounded-md border border-border bg-muted"
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
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step {eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
