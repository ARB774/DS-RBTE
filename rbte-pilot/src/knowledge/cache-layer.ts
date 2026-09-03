import * as fs from "node:fs";
import * as path from "node:path";
import { PackId } from "./types.js";
import { PACK_REPOS, FetchResult } from "./github-fetcher.js";

export const LRU_MAX_ENTRIES = 1000;
export const DISK_CACHE_DIRNAME = ".knowledge-cache";

interface LruEntry {
  key: string;
  value: CacheEntry;
  prev: LruEntry | null;
  next: LruEntry | null;
}

export interface CacheEntry {
  content: string;
  etag: string;
  fetchedAt: number;
}

export interface CacheLookupResult {
  hit: boolean;
  entry?: CacheEntry;
}

function getCacheDir(rootDir: string, pack: PackId, commit: string): string {
  return path.join(rootDir, DISK_CACHE_DIRNAME, pack, commit);
}

function getCacheFilePath(
  rootDir: string,
  pack: PackId,
  commit: string,
  filePath: string,
): string {
  const dir = getCacheDir(rootDir, pack, commit);
  const sanitized = filePath.replace(/^\/+/g, "__").replace(/[^\w.\-]/g, "_");
  return path.join(dir, `${sanitized}.json`);
}

function readDiskCache(
  rootDir: string,
  pack: PackId,
  commit: string,
  filePath: string,
): CacheLookupResult {
  try {
    const cachePath = getCacheFilePath(rootDir, pack, commit, filePath);
    if (!fs.existsSync(cachePath)) {
      return { hit: false };
    }
    const raw = fs.readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(raw) as CacheEntry;
    return { hit: true, entry: parsed };
  } catch {
    return { hit: false };
  }
}

function writeDiskCache(
  rootDir: string,
  pack: PackId,
  commit: string,
  filePath: string,
  entry: CacheEntry,
): void {
  try {
    const cachePath = getCacheFilePath(rootDir, pack, commit, filePath);
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(entry), "utf-8");
  } catch {
  }
}

export class CacheLayer {
  private readonly map: Map<string, LruEntry> = new Map();
  private head: LruEntry | null = null;
  private tail: LruEntry | null = null;
  private readonly maxEntries: number;
  private readonly rootDir: string;

  constructor(rootDir: string, maxEntries: number = LRU_MAX_ENTRIES) {
    this.rootDir = rootDir;
    this.maxEntries = maxEntries;
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  private detach(entry: LruEntry): void {
    if (entry.prev) {
      entry.prev.next = entry.next;
    } else {
      this.head = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    } else {
      this.tail = entry.prev;
    }
    entry.prev = null;
    entry.next = null;
  }

  private attach(entry: LruEntry): void {
    entry.prev = null;
    entry.next = this.head;
    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
    if (!this.tail) {
      this.tail = entry;
    }
  }

  private touch(entry: LruEntry): void {
    this.detach(entry);
    this.attach(entry);
  }

  private evict(): void {
    while (this.map.size > this.maxEntries && this.tail) {
      const victim = this.tail;
      this.detach(victim);
      this.map.delete(victim.key);
    }
  }

  getCacheDirPath(): string {
    return path.join(this.rootDir, DISK_CACHE_DIRNAME);
  }

  get(
    pack: PackId,
    commit: string,
    filePath: string,
  ): CacheLookupResult {
    const effectiveCommit = commit ?? PACK_REPOS[pack].defaultCommit;
    const key = `${pack}:${effectiveCommit}:${filePath}`;

    const lruEntry = this.map.get(key);
    if (lruEntry) {
      this.touch(lruEntry);
      return { hit: true, entry: lruEntry.value };
    }

    const diskResult = readDiskCache(this.rootDir, pack, effectiveCommit, filePath);
    if (diskResult.hit && diskResult.entry) {
      this.set(pack, effectiveCommit, filePath, diskResult.entry);
      return diskResult;
    }

    return { hit: false };
  }

  set(
    pack: PackId,
    commit: string,
    filePath: string,
    entry: CacheEntry,
  ): void {
    const effectiveCommit = commit ?? PACK_REPOS[pack].defaultCommit;
    const key = `${pack}:${effectiveCommit}:${filePath}`;

    const existing = this.map.get(key);
    if (existing) {
      existing.value = entry;
      this.touch(existing);
    } else {
      const node: LruEntry = {
        key,
        value: entry,
        prev: null,
        next: null,
      };
      this.map.set(key, node);
      this.attach(node);
      this.evict();
    }

    writeDiskCache(this.rootDir, pack, effectiveCommit, filePath, entry);
  }

  setFromFetch(
    pack: PackId,
    commit: string,
    filePath: string,
    fetch: FetchResult,
  ): void {
    if (fetch.status === 404 || fetch.status === 304 || fetch.content === "") {
      return;
    }
    this.set(pack, commit, filePath, {
      content: fetch.content,
      etag: fetch.etag,
      fetchedAt: fetch.fetchedAt,
    });
  }

  invalidate(pack: PackId, commit: string, filePath: string): void {
    const effectiveCommit = commit ?? PACK_REPOS[pack].defaultCommit;
    const key = `${pack}:${effectiveCommit}:${filePath}`;
    const existing = this.map.get(key);
    if (existing) {
      this.detach(existing);
      this.map.delete(key);
    }
    try {
      const cachePath = getCacheFilePath(this.rootDir, pack, effectiveCommit, filePath);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch {
    }
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  size(): number {
    return this.map.size;
  }
}

export function createCacheLayer(rootDir: string): CacheLayer {
  return new CacheLayer(rootDir, LRU_MAX_ENTRIES);
}
