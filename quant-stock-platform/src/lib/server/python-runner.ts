import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, resolve } from "node:path";

type PythonCandidate = {
  command: string;
  prefixArgs: string[];
  absolute?: boolean;
};

type PythonProbeResult = {
  available: boolean;
  command: string | null;
  prefixArgs: string[];
  version: string | null;
  errorMessage: string | null;
  akshareInstalled: boolean;
  pandasInstalled: boolean;
};

type RunPythonOptions = {
  args?: string[];
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const PROBE_CACHE_MS = 15_000;

let cachedPythonProbe:
  | (PythonProbeResult & {
      expiresAt: number;
    })
  | null = null;

function buildCandidates() {
  const envPython = process.env.AKSHARE_PYTHON_BIN?.trim();
  const repoRoot = /* turbopackIgnore: true */ process.cwd();

  return [
    envPython
      ? {
          command: envPython,
          prefixArgs: [],
          absolute: envPython.startsWith("/") || envPython.includes("\\"),
        }
      : null,
    {
      command: resolve(repoRoot, ".venv", "bin", "python"),
      prefixArgs: [],
      absolute: true,
    },
    {
      command: resolve(repoRoot, ".venv", "Scripts", "python.exe"),
      prefixArgs: [],
      absolute: true,
    },
    { command: "python", prefixArgs: [] },
    { command: "python3", prefixArgs: [] },
    { command: "py", prefixArgs: ["-3"] },
    { command: "py", prefixArgs: [] },
  ].filter(Boolean) as PythonCandidate[];
}

async function isAccessibleAbsoluteCommand(command: string) {
  try {
    await access(command);
    return true;
  } catch {
    return false;
  }
}

async function executeProcess(
  command: string,
  args: string[],
  timeoutMs: number,
) {
  return await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    spawnError: Error | null;
  }>((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: /* turbopackIgnore: true */ process.cwd(),
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        http_proxy: "",
        https_proxy: "",
        HTTP_PROXY: "",
        HTTPS_PROXY: "",
        ALL_PROXY: "",
        all_proxy: "",
        NO_PROXY: "*",
        no_proxy: "*",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError: Error | null = null;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      spawnError = error;
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolvePromise({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        timedOut,
        spawnError,
      });
    });
  });
}

async function findPythonRuntime() {
  if (cachedPythonProbe && cachedPythonProbe.expiresAt > Date.now()) {
    return cachedPythonProbe;
  }

  const candidates = buildCandidates();

  for (const candidate of candidates) {
    if (candidate.absolute) {
      const exists = await isAccessibleAbsoluteCommand(candidate.command);

      if (!exists) {
        continue;
      }
    }

    const versionResult = await executeProcess(
      candidate.command,
      [...candidate.prefixArgs, "--version"],
      5_000,
    );

    if (
      versionResult.spawnError ||
      versionResult.timedOut ||
      versionResult.exitCode !== 0
    ) {
      continue;
    }

    const versionOutput = versionResult.stdout || versionResult.stderr;
    const pythonVersion = versionOutput.replace(/^Python\s+/i, "").trim() || null;
    const probeScript = [
      "import importlib.util, json, sys",
      "print(json.dumps({",
      '  "pythonVersion": sys.version.split()[0],',
      '  "akshareInstalled": importlib.util.find_spec("akshare") is not None,',
      '  "pandasInstalled": importlib.util.find_spec("pandas") is not None',
      "}, ensure_ascii=False))",
    ].join("\n");
    const probeResult = await executeProcess(
      candidate.command,
      [...candidate.prefixArgs, "-c", probeScript],
      8_000,
    );

    if (
      probeResult.spawnError ||
      probeResult.timedOut ||
      probeResult.exitCode !== 0
    ) {
      cachedPythonProbe = {
        expiresAt: Date.now() + PROBE_CACHE_MS,
        available: true,
        command: candidate.command,
        prefixArgs: candidate.prefixArgs,
        version: pythonVersion,
        errorMessage: probeResult.spawnError
          ? probeResult.spawnError.message
          : probeResult.timedOut
            ? "Python 环境检测超时"
            : probeResult.stderr || "Python 环境检测失败",
        akshareInstalled: false,
        pandasInstalled: false,
      };

      return cachedPythonProbe;
    }

    try {
      const parsed = JSON.parse(probeResult.stdout) as {
        pythonVersion?: string;
        akshareInstalled?: boolean;
        pandasInstalled?: boolean;
      };

      cachedPythonProbe = {
        expiresAt: Date.now() + PROBE_CACHE_MS,
        available: true,
        command: candidate.command,
        prefixArgs: candidate.prefixArgs,
        version: parsed.pythonVersion ?? pythonVersion,
        errorMessage: null,
        akshareInstalled: Boolean(parsed.akshareInstalled),
        pandasInstalled: Boolean(parsed.pandasInstalled),
      };

      return cachedPythonProbe;
    } catch {
      cachedPythonProbe = {
        expiresAt: Date.now() + PROBE_CACHE_MS,
        available: true,
        command: candidate.command,
        prefixArgs: candidate.prefixArgs,
        version: pythonVersion,
        errorMessage: "Python 环境检测输出不是合法 JSON",
        akshareInstalled: false,
        pandasInstalled: false,
      };

      return cachedPythonProbe;
    }
  }

  cachedPythonProbe = {
    expiresAt: Date.now() + PROBE_CACHE_MS,
    available: false,
    command: null,
    prefixArgs: [],
    version: null,
    errorMessage:
      "未找到可用的 Python 命令，已尝试 python、python3、py。",
    akshareInstalled: false,
    pandasInstalled: false,
  };

  return cachedPythonProbe;
}

export function resetPythonProbeCache() {
  cachedPythonProbe = null;
}

export async function probePythonEnvironment() {
  return await findPythonRuntime();
}

export async function runPythonJsonScript<T>(
  scriptRelativePath: string,
  options: RunPythonOptions = {},
) {
  const runtime = await findPythonRuntime();

  if (!runtime.available || !runtime.command) {
    throw new Error(runtime.errorMessage ?? "Python 不可用");
  }

  const scriptPath = resolve(
    /* turbopackIgnore: true */ process.cwd(),
    scriptRelativePath,
  );
  const scriptName = basename(scriptPath);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = options.args ?? [];
  const result = await executeProcess(
    runtime.command,
    [...runtime.prefixArgs, scriptPath, ...args],
    timeoutMs,
  );

  if (result.spawnError) {
    throw new Error(
      `执行 Python 脚本失败（${scriptName}）：${result.spawnError.message}`,
    );
  }

  if (result.timedOut) {
    throw new Error(`Python 脚本执行超时（${scriptName}）`);
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `Python 脚本执行失败（${scriptName}）：${result.stderr || result.stdout || "未知错误"}`,
    );
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(
      `Python 脚本输出不是合法 JSON（${scriptName}）：${result.stdout.slice(0, 240) || "空输出"}`,
    );
  }
}
