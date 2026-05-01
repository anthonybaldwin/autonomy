import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Mode = "stop" | "resume" | "check" | "enqueue" | "activate" | "complete";

type QueueItem = {
  id: string;
  priority: "high" | "normal" | "low";
  execution_policy: "run-now" | "run-after-current-step" | "run-next-turn";
  owner_agent: string;
  status: "pending" | "running" | "blocked" | "done" | "failed" | "cancelled";
  requires_approval: boolean;
  description?: string;
};

type QueueState = {
  version: number;
  active: QueueItem | null;
  scheduler: {
    paused: boolean;
    stopAutonomy: boolean;
    stopAndClear: boolean;
    updatedAt: string;
  };
  items: QueueItem[];
  completed: QueueItem[];
};

const MODES: Mode[] = ["stop", "resume", "check", "enqueue", "activate", "complete"];
const [, , modeArg, ...rest] = process.argv;
const mode = modeArg as Mode;

if (!MODES.includes(mode)) {
  console.error(
    "Usage: bun scripts/autonomy-state.ts <stop|resume|check|enqueue|activate|complete> [options]",
  );
  console.error("  stop [--clear]        Pause scheduler (optionally clear queue)");
  console.error("  resume                Unpause scheduler");
  console.error("  check                 Print current state and exit 0 if runnable, 1 if stopped");
  console.error(
    "  enqueue               Add item: --id --agent --priority --policy [--description]",
  );
  console.error("  activate              Move highest-priority pending item to active");
  console.error("  complete [--status]   Mark active item done/failed (default: done)");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const seedPath = resolve(repoRoot, "agents", "queue-state.example.json");
const queuePath = resolve(repoRoot, "agents", "queue-state.json");

if (!existsSync(queuePath)) {
  if (!existsSync(seedPath)) {
    console.error("Missing seed queue state: agents/queue-state.example.json");
    process.exit(1);
  }
  copyFileSync(seedPath, queuePath);
}

const raw = readFileSync(queuePath, "utf8");
const state = JSON.parse(raw) as QueueState;
const now = new Date().toISOString();

state.version = state.version ?? 1;
state.scheduler = state.scheduler ?? {
  paused: false,
  stopAutonomy: false,
  stopAndClear: false,
  updatedAt: now,
};
state.items = Array.isArray(state.items) ? state.items : [];
state.completed = Array.isArray(state.completed) ? state.completed : [];
state.active = state.active ?? null;

function getArg(name: string): string | undefined {
  const idx = rest.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < rest.length ? rest[idx + 1] : undefined;
}

const clear = rest.includes("--clear");

switch (mode) {
  case "stop": {
    state.scheduler.paused = true;
    state.scheduler.stopAutonomy = true;
    state.scheduler.stopAndClear = clear;
    if (clear) {
      state.items = [];
      state.active = null;
    }
    break;
  }

  case "resume": {
    state.scheduler.paused = false;
    state.scheduler.stopAutonomy = false;
    state.scheduler.stopAndClear = false;
    break;
  }

  case "check": {
    const canRun = !state.scheduler.paused && !state.scheduler.stopAutonomy;
    console.log(
      JSON.stringify({
        canRun,
        paused: state.scheduler.paused,
        stopAutonomy: state.scheduler.stopAutonomy,
        activeItem: state.active?.id ?? null,
        pendingCount: state.items.length,
        completedCount: state.completed.length,
      }),
    );
    process.exit(canRun ? 0 : 1);
    break;
  }

  case "enqueue": {
    const id = getArg("id");
    const agent = getArg("agent");
    const priority = (getArg("priority") ?? "normal") as QueueItem["priority"];
    const policy = (getArg("policy") ?? "run-next-turn") as QueueItem["execution_policy"];
    const description = getArg("description");
    if (!id || !agent) {
      console.error("enqueue requires --id and --agent");
      process.exit(1);
    }
    const item: QueueItem = {
      id,
      priority,
      execution_policy: policy,
      owner_agent: agent,
      status: "pending",
      requires_approval: false,
      ...(description && { description }),
    };
    state.items.push(item);
    // Sort: high > normal > low
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    state.items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    console.log(`[autonomy-state] enqueued id=${id} agent=${agent} priority=${priority}`);
    break;
  }

  case "activate": {
    if (state.active) {
      console.error(`[autonomy-state] cannot activate: item already active (${state.active.id})`);
      process.exit(1);
    }
    const next = state.items.shift();
    if (!next) {
      console.error("[autonomy-state] cannot activate: queue is empty");
      process.exit(1);
    }
    next.status = "running";
    state.active = next;
    console.log(
      `[autonomy-state] activated id=${state.active.id} agent=${state.active.owner_agent}`,
    );
    break;
  }

  case "complete": {
    if (!state.active) {
      console.error("[autonomy-state] cannot complete: no active item");
      process.exit(1);
    }
    const finalStatus = (getArg("status") ?? "done") as "done" | "failed";
    state.active.status = finalStatus;
    state.completed.push(state.active);
    console.log(`[autonomy-state] completed id=${state.active.id} status=${finalStatus}`);
    state.active = null;
    break;
  }
}

state.scheduler.updatedAt = now;
writeFileSync(queuePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

console.log(
  `[autonomy-state] mode=${mode} paused=${state.scheduler.paused} active=${state.active?.id ?? "none"} pending=${state.items.length} completed=${state.completed.length}`,
);
