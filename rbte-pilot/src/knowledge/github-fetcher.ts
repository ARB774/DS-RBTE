import { PackId } from "./types.js";

const PACK_TOC_DEFAULT_COMMIT = process.env.PACK_TOC_COMMIT || "replace-with-real-pack-toc-hash";
const GITHUB_READ_TOKEN = process.env.GITHUB_READ_TOKEN || "";
const PRIVATE_PACK_IDS = new Set<PackId>([PackId.PACK_TOC]);

export const PACK_REPOS: Record<PackId, { owner: string; repo: string; defaultCommit: string }> = {
  [PackId.FPF]: {
    owner: "ailev",
    repo: "FPF",
    defaultCommit: "3d098629dc218572089f1890080c17d6f1d9a867",
  },
  [PackId.PACK_TOC]: {
    owner: "Victor57618",
    repo: "Pack-TOC",
    defaultCommit: PACK_TOC_DEFAULT_COMMIT,
  },
  [PackId.PACK_AL]: {
    owner: "ARB774",
    repo: "PACK-adult-learning",
    defaultCommit: "a6a3140",
  },
  [PackId.PACK_ATB]: {
    owner: "ARB774",
    repo: "Pack-ATB",
    defaultCommit: "replace-when-pack-atb-exists",
  },
};

export interface FetchResult {
  content: string;
  etag: string;
  status: number;
  fetchedAt: number;
  fromNetwork: boolean;
}

export interface FetchOptions {
  signal?: AbortSignal;
  retries?: number;
  retryDelayMs?: number;
  etag?: string;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const NOT_MODIFIED = 304;

export function buildRawUrl(
  pack: PackId,
  path: string,
  commit: string = PACK_REPOS[pack].defaultCommit,
): string {
  const { owner, repo } = PACK_REPOS[pack];
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${normalizedPath}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPrivateViaContentsApi(
  pack: PackId,
  path: string,
  commit: string,
  options: FetchOptions,
): Promise<FetchResult> {
  const { owner, repo } = PACK_REPOS[pack];
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${normalizedPath}?ref=${commit}`;

  if (!GITHUB_READ_TOKEN) {
    throw new Error(
      `GITHUB_READ_TOKEN env var is required for private pack ${pack} (${owner}/${repo}). Set it in .env.local.`,
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
    Authorization: `Bearer ${GITHUB_READ_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rbte-knowledge-mcp-client/1.0",
  };

  if (options.etag) {
    headers["If-None-Match"] = options.etag;
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
    signal: options.signal,
  });

  if (response.status === NOT_MODIFIED) {
    return {
      content: "",
      etag: response.headers.get("ETag") ?? options.etag ?? "",
      status: NOT_MODIFIED,
      fetchedAt: Date.now(),
      fromNetwork: true,
    };
  }

  if (response.status === 404) {
    return {
      content: "",
      etag: response.headers.get("ETag") ?? "",
      status: 404,
      fetchedAt: Date.now(),
      fromNetwork: true,
    };
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    const rateLimitReset = response.headers.get("X-RateLimit-Reset");
    throw new Error(
      `GitHub Contents API 403 for private ${pack}/${normalizedPath}: rateLimitRemaining=${rateLimitRemaining}, reset=${rateLimitReset}. ` +
        `Check token scope (needs Contents:Read on ${owner}/${repo}) or wait rate limit reset.`,
    );
  }

  if (response.status >= 500 || response.status === 429) {
    throw new Error(`GitHub Contents API ${response.status} for ${apiUrl}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "(could not read error body)");
    throw new Error(
      `GitHub Contents API ${response.status} for private ${pack}/${normalizedPath}: ${errText.slice(0, 250)}`,
    );
  }

  return {
    content: await response.text(),
    etag: response.headers.get("ETag") ?? "",
    status: response.status,
    fetchedAt: Date.now(),
    fromNetwork: true,
  };
}

export async function fetchPackRaw(
  pack: PackId,
  path: string,
  commit?: string,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const {
    signal,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    etag,
  } = options;

  const effectiveCommit = commit ?? PACK_REPOS[pack].defaultCommit;
  const url = buildRawUrl(pack, path, effectiveCommit);

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (PRIVATE_PACK_IDS.has(pack)) {
        return await fetchPrivateViaContentsApi(pack, path, effectiveCommit, options);
      }

      const headers: Record<string, string> = {
        Accept: "text/plain;charset=UTF-8",
        "User-Agent": "rbte-knowledge-mcp-client/1.0",
      };

      if (etag) {
        headers["If-None-Match"] = etag;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal,
      });

      if (response.status === NOT_MODIFIED) {
        return {
          content: "",
          etag: response.headers.get("ETag") ?? etag ?? "",
          status: NOT_MODIFIED,
          fetchedAt: Date.now(),
          fromNetwork: true,
        };
      }

      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(
          `GitHub raw fetch ${response.status} for ${url} (attempt ${attempt + 1}/${retries + 1})`,
        );
        if (attempt < retries) {
          const backoff = retryDelayMs * Math.pow(2, attempt);
          await sleep(backoff);
          continue;
        }
        throw lastError;
      }

      if (response.status === 404) {
        return {
          content: "",
          etag: response.headers.get("ETag") ?? "",
          status: 404,
          fetchedAt: Date.now(),
          fromNetwork: true,
        };
      }

      if (!response.ok) {
        throw new Error(`GitHub raw fetch ${response.status} for ${url}`);
      }

      const content = await response.text();

      return {
        content,
        etag: response.headers.get("ETag") ?? "",
        status: response.status,
        fetchedAt: Date.now(),
        fromNetwork: true,
      };
    } catch (err) {
      lastError = err;
      if (attempt < retries && !(err instanceof DOMException && err.name === "AbortError")) {
        const backoff = retryDelayMs * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }
      throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to fetch ${url}: ${String(err)}`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}
