"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  INTERNAL_STAGES,
  type InternalStage,
} from "@/lib/orderStages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  orderId: Id<"orders">;
  internalStages: ReadonlyArray<InternalStage>;
};

// Admin checklist for the internal 14-stage pipeline (issue 2-12). Checking a
// stage stamps `completedAt: now`; unchecking clears it. We always send the
// full canonical 14-stage array so the persisted record is normalized even
// for orders created before the full list existed (they start life with just
// "Inquiry"). Convex's real-time subscription pushes the change to the
// customer portal timeline without a refresh on either end.
export function OrderStageChecklist({ orderId, internalStages }: Props) {
  const updateStages = useMutation(api.admin.updateOrderStages);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Current completion state keyed by stage name. Drives the checkboxes
  // straight from props so the UI reflects whatever Convex last pushed.
  const completedAt = new Map<string, number | null | undefined>(
    internalStages.map((s) => [s.name, s.completedAt]),
  );

  const handleToggle = async (stageName: string, checked: boolean) => {
    if (pending) return;
    setPending(stageName);
    setError(null);

    // Rebuild the full 14-stage array, preserving every other stage's
    // timestamp and applying the toggle to the one that changed.
    const stages = INTERNAL_STAGES.map((name) => {
      if (name === stageName) {
        return { name, completedAt: checked ? Date.now() : null };
      }
      const existing = completedAt.get(name);
      return { name, completedAt: existing ?? null };
    });

    try {
      await updateStages({ orderId, stages });
    } catch (err) {
      const message =
        err instanceof ConvexError
          ? String(err.data)
          : err instanceof Error
            ? err.message
            : "Failed to update stage.";
      setError(message);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <ul className="space-y-2">
        {INTERNAL_STAGES.map((name) => {
          const stamp = completedAt.get(name);
          const completed = stamp != null;
          const checkboxId = `stage-${slug(name)}`;
          return (
            <li
              key={name}
              className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2.5">
                <Checkbox
                  id={checkboxId}
                  checked={completed}
                  disabled={pending !== null}
                  onCheckedChange={(value) =>
                    handleToggle(name, value === true)
                  }
                />
                <Label
                  htmlFor={checkboxId}
                  className={
                    completed
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {name}
                </Label>
              </span>
              <span className="text-xs text-muted-foreground">
                {completed && stamp != null
                  ? formatTimestamp(stamp)
                  : "Pending"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
