import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Mode = "stop" | "resume" | "check" | "doctor" | "enqueue" | "activate" | "complete";

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

const MODES: Mode[] = ["stop", "resume", "check", "doctor", "enqueue", "activate", "complete"];
const [, , modeArg, ...rest] = process.argv;
const mode = modeArg as Mode;

if (!MODES.includes(mode)) {
  console.error(
    "Usage: bun scripts/autonomy-state.ts <stop|resume|check|doctor|enqueue|activate|complete> [options]",
  );
  console.error("  stop [--clear]        Pause scheduler (optionally clear queue)");
  console.error("  resume                Unpause scheduler");
  console.error("  check                 Print current state and exit 0 if runnable, 1 if stopped");
  console.error("  doctor                Diagnose queue setup, roster, and ignored runtime files");
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
const rosterPath = resolve(repoRoot, "agents", "roster.yaml");
const gitignorePath = resolve(repoRoot, ".gitignore");
const packagePath = resolve(repoRoot, "package.json");
const queueExistedAtStart = existsSync(queuePath);

let raw: string;
if (!queueExistedAtStart) {
  if (!existsSync(seedPath)) {
    console.error("Missing seed queue state: agents/queue-state.example.json");
    process.exit(1);
  }
  raw = readFileSync(seedPath, "utf8");
} else {
  raw = readFileSync(queuePath, "utf8");
}

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
const priorityOrder: Record<QueueItem["priority"], number> = { high: 0, normal: 1, low: 2 };
const priorities = Object.keys(priorityOrder);
const policies: QueueItem["execution_policy"][] = [
  "run-now",
  "run-after-current-step",
  "run-next-turn",
];
const runtimeNames = new Set([
  "codex",
  "claude",
  "claude-code",
  "gemini",
  "gemini-cli",
  "worker",
  "verifier",
]);

function loadRosterIds(): string[] | null {
  if (!existsSync(rosterPath)) {
    return null;
  }

  const roster = readFileSync(rosterPath, "utf8");
  const ids = [...roster.matchAll(/^\s*-\s+id:\s*["']?([A-Za-z0-9_.-]+)["']?\s*$/gm)]
    .map((match) => match[1])
    .filter(Boolean);
  return [...new Set(ids)];
}

function validateOwnerAgent(agent: string): string | null {
  const rosterIds = loadRosterIds();
  if (!rosterIds) {
    return "Missing agents/roster.yaml; owner_agent cannot be validated";
  }
  if (rosterIds.length === 0) {
    return "No role ids found in agents/roster.yaml";
  }
  if (rosterIds.includes(agent)) {
    return null;
  }

  const hint = runtimeNames.has(agent)
    ? " Codex/Claude/Gemini/worker/verifier are runtimes, not owner roles, unless the roster explicitly defines them."
    : "";
  return `Unknown owner_agent "${agent}". Use one of: ${rosterIds.join(", ")}.${hint}`;
}

function allQueueItems(): QueueItem[] {
  return [state.active, ...state.items, ...state.completed].filter(
    (item): item is QueueItem => Boolean(item),
  );
}

function printDoctorResult(level: "ok" | "warn" | "error", message: string): void {
  console.log(`[${level}] ${message}`);
}

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

  case "doctor": {
    let errors = 0;
    let warnings = 0;

    const rosterIds = loadRosterIds();
    if (!existsSync(rosterPath)) {
      printDoctorResult("error", "missing agents/roster.yaml");
      errors += 1;
    } else if (!rosterIds || rosterIds.length === 0) {
      printDoctorResult("error", "agents/roster.yaml has no role ids");
      errors += 1;
    } else {
      printDoctorResult("ok", `loaded ${rosterIds.length} roster roles`);
    }

    if (existsSync(seedPath)) {
      printDoctorResult("ok", "found agents/queue-state.example.json");
    } else {
      printDoctorResult("error", "missing agents/queue-state.example.json");
      errors += 1;
    }

    if (queueExistedAtStart) {
      printDoctorResult("ok", "found agents/queue-state.json");
    } else {
      printDoctorResult("ok", "agents/queue-state.json is absent; first state-changing command will create it");
    }

    const invalidOwners = allQueueItems()
      .map((item) => item.owner_agent)
      .filter((agent, index, agents) => agents.indexOf(agent) === index)
      .filter((agent) => validateOwnerAgent(agent) !== null);
    if (invalidOwners.length > 0) {
      printDoctorResult(
        "error",
        `queue contains owner_agent values not present in roster: ${invalidOwners.join(", ")}`,
      );
      errors += 1;
    } else {
      printDoctorResult("ok", "all queue owner_agent values match roster roles");
    }

    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, "utf8");
      for (const pattern of [
        "agents/queue-state.json",
        "agents/handoffs/*",
        "!agents/handoffs/README.md",
      ]) {
        if (gitignore.includes(pattern)) {
          printDoctorResult("ok", `.gitignore includes ${pattern}`);
        } else {
          printDoctorResult("warn", `.gitignore should include ${pattern}`);
          warnings += 1;
        }
      }
    } else {
      printDoctorResult("warn", "missing .gitignore; runtime queue/handoff files may be committed");
      warnings += 1;
    }

    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      const scripts = packageJson.scripts ?? {};
      for (const scriptName of [
        "autonomy:check",
        "autonomy:doctor",
        "autonomy:enqueue",
        "autonomy:activate",
        "autonomy:complete",
        "autonomy:stop",
        "autonomy:resume",
      ]) {
        if (scripts[scriptName]) {
          printDoctorResult("ok", `package.json script ${scriptName} is present`);
        } else {
          printDoctorResult("warn", `package.json script ${scriptName} is missing`);
          warnings += 1;
        }
      }
    } else {
      printDoctorResult("warn", "missing package.json; bun run autonomy:* aliases are unavailable");
      warnings += 1;
    }

    console.log(`[autonomy-state] doctor completed errors=${errors} warnings=${warnings}`);
    process.exit(errors > 0 ? 1 : 0);
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
    if (!priorities.includes(priority)) {
      console.error(`invalid --priority "${priority}"; expected one of: ${priorities.join(", ")}`);
      process.exit(1);
    }
    if (!policies.includes(policy)) {
      console.error(`invalid --policy "${policy}"; expected one of: ${policies.join(", ")}`);
      process.exit(1);
    }
    const ownerError = validateOwnerAgent(agent);
    if (ownerError) {
      console.error(ownerError);
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
    state.items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    console.log(`[autonomy-state] enqueued id=${id} agent=${agent} priority=${priority}`);
    break;
  }

  case "activate": {
    if (state.scheduler.paused || state.scheduler.stopAutonomy) {
      console.error("[autonomy-state] cannot activate: scheduler is paused/stopped");
      process.exit(1);
    }
    if (state.active) {
      console.error(`[autonomy-state] cannot activate: item already active (${state.active.id})`);
      process.exit(1);
    }
    const next = state.items.shift();
    if (!next) {
      console.error("[autonomy-state] cannot activate: queue is empty");
      process.exit(1);
    }
    const ownerError = validateOwnerAgent(next.owner_agent);
    if (ownerError) {
      console.error(ownerError);
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
    if (!["done", "failed"].includes(finalStatus)) {
      console.error('invalid --status; expected "done" or "failed"');
      process.exit(1);
    }
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
