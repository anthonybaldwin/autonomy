import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Mode = "stop" | "resume" | "check" | "doctor" | "enqueue" | "activate" | "complete";

type QueueItem = {
  id: string;
  priority: "high" | "normal" | "low";
  execution_policy: "run-now" | "run-after-current-step" | "run-next-turn";
  owner_role?: string;
  owner_agent?: string;
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
    "Usage: bun autonomy -- <stop|resume|check|doctor|enqueue|activate|complete> [options]",
  );
  console.error("Direct: bun scripts/autonomy-state.ts <mode> [options]");
  console.error("  stop [--clear]        Pause scheduler (optionally clear queue)");
  console.error("  resume                Unpause scheduler");
  console.error("  check                 Print current state and exit 0 if runnable, 1 if stopped");
  console.error("  doctor                Diagnose queue setup, roster, and ignored runtime files");
  console.error(
    "  enqueue               Add item: --id --role --priority --policy [--description]",
  );
  console.error("                        Legacy alias: --agent is accepted as --role");
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
const skillPaths = [
  {
    label: "canonical Codex/repo skill",
    path: resolve(repoRoot, ".agents", "skills", "autonomy-queue", "SKILL.md"),
  },
  {
    label: "Claude Code project skill wrapper",
    path: resolve(repoRoot, ".claude", "skills", "autonomy-queue", "SKILL.md"),
  },
];
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

function getOwnerRole(item: QueueItem): string | undefined {
  return item.owner_role ?? item.owner_agent;
}

function validateOwnerRole(role: string): string | null {
  const rosterIds = loadRosterIds();
  if (!rosterIds) {
    return "Missing agents/roster.yaml; owner_role cannot be validated";
  }
  if (rosterIds.length === 0) {
    return "No role ids found in agents/roster.yaml";
  }
  if (rosterIds.includes(role)) {
    return null;
  }

  const hint = runtimeNames.has(role)
    ? " Runtime names and execution modes are not owner roles, unless the roster explicitly defines them."
    : "";
  return `Unknown owner_role "${role}". Use one of: ${rosterIds.join(", ")}.${hint}`;
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

    for (const skill of skillPaths) {
      if (existsSync(skill.path)) {
        printDoctorResult("ok", `found ${skill.label}`);
      } else {
        printDoctorResult("warn", `missing ${skill.label}`);
        warnings += 1;
      }
    }

    const missingOwnerRoles = allQueueItems().filter((item) => !getOwnerRole(item));
    if (missingOwnerRoles.length > 0) {
      printDoctorResult(
        "error",
        `queue contains items without owner_role: ${missingOwnerRoles.map((item) => item.id).join(", ")}`,
      );
      errors += 1;
    }

    const legacyOwnerAgents = allQueueItems().filter(
      (item) => item.owner_agent && !item.owner_role,
    );
    if (legacyOwnerAgents.length > 0) {
      printDoctorResult(
        "warn",
        `queue uses legacy owner_agent on: ${legacyOwnerAgents.map((item) => item.id).join(", ")}`,
      );
      warnings += 1;
    }

    const invalidOwners = allQueueItems()
      .map((item) => getOwnerRole(item))
      .filter((role): role is string => Boolean(role))
      .filter((role, index, roles) => roles.indexOf(role) === index)
      .filter((role) => validateOwnerRole(role) !== null);
    if (invalidOwners.length > 0) {
      printDoctorResult(
        "error",
        `queue contains owner_role values not present in roster: ${invalidOwners.join(", ")}`,
      );
      errors += 1;
    } else if (missingOwnerRoles.length === 0) {
      printDoctorResult("ok", "all queue owner_role values match roster roles");
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
        "autonomy",
        "autonomy:check",
        "autonomy:doctor",
        "autonomy:enqueue",
        "autonomy:activate",
        "autonomy:complete",
        "autonomy:stop",
        "autonomy:stop:clear",
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
      printDoctorResult("warn", "missing package.json; bun autonomy:* aliases are unavailable");
      warnings += 1;
    }

    console.log(`[autonomy-state] doctor completed errors=${errors} warnings=${warnings}`);
    process.exit(errors > 0 ? 1 : 0);
    break;
  }

  case "enqueue": {
    const id = getArg("id");
    const role = getArg("role") ?? getArg("agent");
    const priority = (getArg("priority") ?? "normal") as QueueItem["priority"];
    const policy = (getArg("policy") ?? "run-next-turn") as QueueItem["execution_policy"];
    const description = getArg("description");
    if (!id || !role) {
      console.error("enqueue requires --id and --role");
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
    const ownerError = validateOwnerRole(role);
    if (ownerError) {
      console.error(ownerError);
      process.exit(1);
    }
    const item: QueueItem = {
      id,
      priority,
      execution_policy: policy,
      owner_role: role,
      status: "pending",
      requires_approval: false,
      ...(description && { description }),
    };
    state.items.push(item);
    state.items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    console.log(`[autonomy-state] enqueued id=${id} role=${role} priority=${priority}`);
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
    const role = getOwnerRole(next);
    if (!role) {
      console.error(`[autonomy-state] cannot activate: item ${next.id} has no owner_role`);
      process.exit(1);
    }
    const ownerError = validateOwnerRole(role);
    if (ownerError) {
      console.error(ownerError);
      process.exit(1);
    }
    if (!next.owner_role) {
      next.owner_role = role;
      delete next.owner_agent;
    }
    next.status = "running";
    state.active = next;
    console.log(
      `[autonomy-state] activated id=${state.active.id} role=${state.active.owner_role}`,
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
