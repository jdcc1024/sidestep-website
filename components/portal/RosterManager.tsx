"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ROSTER_NAME_MAX_LENGTH,
  ROSTER_NUMBER_MAX_LENGTH,
  validateRosterEntry,
} from "@/lib/rosterEntry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Per-design roster seeding (R-03). A captain pre-enters name+number
// "player slots" under each of the order's designs; a slot with no order
// entry yet shows as "Not yet filled" and doesn't count toward the
// production total until a fan (or the captain) orders a size against it.
// Reads the grouped, filled-annotated view from rosterEntries.listForRun
// and writes through create/update/remove — all gated server-side on
// order ownership.
export function RosterManager({ runId }: { runId: Id<"jerseyRuns"> }) {
  const data = useQuery(api.rosterEntries.listForRun, { runId });

  if (data === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  // Null means the run or its order vanished — nothing to seed against.
  if (data === null) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Roster
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-enter known players per design. A slot stays{" "}
          <span className="font-medium text-foreground">not yet filled</span>{" "}
          until someone orders a size for it.
        </p>
      </div>

      {data.designs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground">
          Attach a design to this order to start seeding its roster.
        </p>
      ) : (
        <div className="space-y-6">
          {data.designs.map((design) => (
            <DesignRoster
              key={design.designId}
              runId={runId}
              designId={design.designId}
              title={design.title}
              entries={design.entries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SlotEntry = {
  _id: Id<"rosterEntries">;
  name: string;
  number?: string;
  source: "captain" | "fan";
  filled: boolean;
};

function DesignRoster({
  runId,
  designId,
  title,
  entries,
}: {
  runId: Id<"jerseyRuns">;
  designId: Id<"designs">;
  title: string;
  entries: SlotEntry[];
}) {
  const create = useMutation(api.rosterEntries.create);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [adding, setAdding] = useState(false);

  async function onAdd() {
    const errors = validateRosterEntry({ name, number });
    if (errors.name || errors.number) {
      toast.error(errors.name ?? errors.number);
      return;
    }
    setAdding(true);
    try {
      await create({
        runId,
        designId,
        name: name.trim(),
        number: number.trim() || undefined,
      });
      setName("");
      setNumber("");
    } catch (err) {
      toast.error("Could not add player", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>

      <ul className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">No players yet.</li>
        ) : (
          entries.map((entry) => (
            <SlotRow key={entry._id} entry={entry} />
          ))
        )}
      </ul>

      <div className="mt-3 grid grid-cols-[1fr_110px_auto] gap-2">
        <Input
          placeholder="Player name"
          value={name}
          maxLength={ROSTER_NAME_MAX_LENGTH}
          aria-label={`Add player name for ${title}`}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onAdd();
            }
          }}
        />
        <Input
          placeholder="No."
          value={number}
          maxLength={ROSTER_NUMBER_MAX_LENGTH}
          aria-label={`Add player number for ${title}`}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={adding}
          onClick={() => void onAdd()}
        >
          <PlusIcon />
          Add
        </Button>
      </div>
    </div>
  );
}

function SlotRow({ entry }: { entry: SlotEntry }) {
  const update = useMutation(api.rosterEntries.update);
  const remove = useMutation(api.rosterEntries.remove);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.name);
  const [number, setNumber] = useState(entry.number ?? "");
  const [busy, setBusy] = useState(false);

  async function onSave() {
    const errors = validateRosterEntry({ name, number });
    if (errors.name || errors.number) {
      toast.error(errors.name ?? errors.number);
      return;
    }
    setBusy(true);
    try {
      await update({
        rosterEntryId: entry._id,
        name: name.trim(),
        number: number.trim() || undefined,
      });
      setEditing(false);
    } catch (err) {
      toast.error("Could not save player", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      await remove({ rosterEntryId: entry._id });
    } catch (err) {
      toast.error("Could not remove player", {
        description: err instanceof Error ? err.message : undefined,
      });
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="grid grid-cols-[1fr_110px_auto_auto] gap-2">
        <Input
          value={name}
          maxLength={ROSTER_NAME_MAX_LENGTH}
          aria-label={`Edit name for ${entry.name}`}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          value={number}
          maxLength={ROSTER_NUMBER_MAX_LENGTH}
          aria-label={`Edit number for ${entry.name}`}
          onChange={(e) => setNumber(e.target.value)}
        />
        <Button type="button" size="sm" disabled={busy} onClick={() => void onSave()}>
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setName(entry.name);
            setNumber(entry.number ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
      <span className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <span className="font-medium">{entry.name}</span>
        {entry.number ? (
          <span className="text-muted-foreground">#{entry.number}</span>
        ) : null}
        {entry.filled ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
          >
            Filled
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Not yet filled
          </Badge>
        )}
      </span>
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Edit ${entry.name}`}
          onClick={() => setEditing(true)}
        >
          <PencilIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label={`Remove ${entry.name}`}
          onClick={() => void onRemove()}
        >
          <XIcon />
        </Button>
      </span>
    </li>
  );
}
