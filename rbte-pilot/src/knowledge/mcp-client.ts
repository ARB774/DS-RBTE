import * as path from "node:path";
import { z, ZodError } from "zod";
import {
  PackId,
  Operation,
  EntityKind,
  EntityStatus,
  EntityMeta,
  SearchResult,
  NormativeBlock,
  WpSchema,
  DistinctionEntry,
  CommonFailureMode,
  DistinctionsBundle,
  NotFoundError,
  TermFilterViolation,
  SearchParams,
  GetByIdParams,
  GetWpSchemaParams,
  GetDistinctionsParams,
  GetSourceMetaParams,
  KnowledgeResult,
  searchParamsSchema,
  getByIdParamsSchema,
  getWpSchemaParamsSchema,
  getDistinctionsParamsSchema,
  getSourceMetaParamsSchema,
  entityKindSchema,
  entityStatusSchema,
} from "./types.js";
import { PACK_REPOS, fetchPackRaw, buildRawUrl } from "./github-fetcher.js";
import { CacheLayer, createCacheLayer } from "./cache-layer.js";

export const TERM_FILTER_PATTERN =
  /допущение[а-яА-ЯёЁ\s]*?(?:человек|компания|организация|person|company)/iu;
export const TERM_FILTER_PATTERN_REVERSE =
  /(?:человек|компания|организация|person|company)[а-яА-ЯёЁa-zA-Z\s]*?допущение/iu;

export interface TermCheckResult {
  passed: boolean;
  violations: TermFilterViolation[];
}

export function checkTermCompatibility(
  entityId: string,
  pack: PackId,
  filePath: string,
  content: string,
): TermCheckResult {
  const violations: TermFilterViolation[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    let matchedPattern: string | null = null;

    const fwdMatch = line.match(TERM_FILTER_PATTERN);
    if (fwdMatch) {
      matchedPattern = fwdMatch[0] ?? "";
    } else {
      const revMatch = line.match(TERM_FILTER_PATTERN_REVERSE);
      if (revMatch) {
        matchedPattern = revMatch[0] ?? "";
      }
    }

    if (matchedPattern) {
      violations.push({
        entityId,
        pack,
        path: filePath,
        matchedPattern,
        lineSnippet: line.trim().slice(0, 160),
      });
    }
  }

  return { passed: violations.length === 0, violations };
}

interface IndexEntry {
  entityId: string;
  kind: EntityKind;
  title: string;
  summary: string;
  status: EntityStatus;
  pack: PackId;
  path: string;
  commit: string;
}

interface StepIndexEntry {
  stepId: string;
  label: string;
  distinctionIds: string[];
  failureModeIds: string[];
  relatedEntityIds: string[];
}

export class McpKnowledgeClient {
  private readonly cache: CacheLayer;
  private readonly rootDir: string;
  private index: Map<string, IndexEntry> = new Map();
  private stepIndex: Map<string, StepIndexEntry> = new Map();
  private indexBuilt = false;
  private readonly packCommits: Record<PackId, string>;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.cache = createCacheLayer(rootDir);
    this.packCommits = {
      [PackId.FPF]: PACK_REPOS[PackId.FPF].defaultCommit,
      [PackId.PACK_AL]: PACK_REPOS[PackId.PACK_AL].defaultCommit,
      [PackId.PACK_TOC]: (PACK_REPOS as any)[PackId.PACK_TOC]?.defaultCommit ?? process.env.PACK_TOC_COMMIT ?? "",
      [PackId.PACK_ATB]: (PACK_REPOS as any)[PackId.PACK_ATB]?.defaultCommit ?? "",
    };
  }

  getCacheDir(): string {
    return this.cache.getCacheDirPath();
  }

  private buildIndexLock: Promise<void> | null = null;

  async ensureIndexBuilt(force = false): Promise<void> {
    if (this.indexBuilt && !force) return;
    if (this.buildIndexLock) {
      await this.buildIndexLock;
      return;
    }
    this.buildIndexLock = this.buildIndexInternal().finally(() => {
      this.buildIndexLock = null;
    });
    await this.buildIndexLock;
  }

  private async buildIndexInternal(): Promise<void> {
    this.index.clear();
    this.stepIndex.clear();

    const manifestRaw = await this.getOrFetch(
      PackId.PACK_AL,
      "00-pack-manifest.md",
    );
    this.parsePackManifest(manifestRaw, PackId.PACK_AL);

    const distinctionsRaw = await this.getOrFetch(
      PackId.PACK_AL,
      "01-domain-contract/01B-distinctions.md",
    );
    this.parseDistinctionsIndex(distinctionsRaw);

    const wpRaw = await this.getOrFetch(
      PackId.PACK_AL,
      "04-work-products/work-products.md",
    );
    this.parseWorkProductsIndex(wpRaw);

    const fmRaw = await this.getOrFetch(
      PackId.PACK_AL,
      "05-failure-modes/failure-modes.md",
    );
    this.parseFailureModesIndex(fmRaw);

    this.buildStepIndex();

    this.indexBuilt = true;
  }

  private parsePackManifest(manifestContent: string, pack: PackId): void {
    const commit = this.packCommits[pack];
    const lines = manifestContent.split(/\r?\n/);
    let inEntityTable = false;
    let headerPassed = false;

    for (const line of lines) {
      if (line.startsWith("## Entity index")) {
        inEntityTable = true;
        continue;
      }
      if (inEntityTable && line.startsWith("## ")) {
        inEntityTable = false;
        continue;
      }
      if (!inEntityTable) continue;

      if (!line.trim() || !line.startsWith("|")) continue;
      if (!headerPassed) {
        if (line.includes("---")) {
          headerPassed = true;
        }
        continue;
      }

      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const [id, name, kindRaw, summary, statusRaw] = cells;
      if (!id || !name || !kindRaw) continue;

      let filePath: string;
      const kindParse = entityKindSchema.safeParse(kindRaw);
      const kind = kindParse.success ? kindParse.data : EntityKind.P;
      const statusParse = entityStatusSchema.safeParse(statusRaw);
      const status = statusParse.success ? statusParse.data : "draft";

      switch (kind) {
        case EntityKind.M:
          filePath = `03-methods/${id}-${this.slugify(name)}.md`;
          break;
        case EntityKind.WP:
          filePath = `04-work-products/work-products.md`;
          break;
        case EntityKind.SC:
          filePath = `08-service-clauses/${id}-${this.slugify(name)}.md`;
          break;
        case EntityKind.P:
          filePath = `${id} — ${name}.md`;
          break;
        case EntityKind.D:
          filePath = `01-domain-contract/01B-distinctions.md`;
          break;
        case EntityKind.FM:
          filePath = `05-failure-modes/failure-modes.md`;
          break;
        default:
          filePath = `${id}.md`;
      }

      this.index.set(id, {
        entityId: id,
        kind,
        title: name,
        summary: summary ?? "",
        status,
        pack,
        path: filePath,
        commit,
      });
    }

    const patternFilenames = [
      "AL.P.001 — Проверка научения после ошибки или инцидента.md",
      "AL.P.002 — Помощь без подмены действия обучающегося.md",
      "AL.P.003 — Обратная связь для изменения следующей пробы.md",
      "AL.P.004 — Практика воспроизведения знания по памяти.md",
      "AL.P.005 — Переход от разобранного примера к самостоятельному действию.md",
      "AL.P.006 — Разбор ошибки и выбор справедливой реакции.md",
      "AL.P.007 — Перенос освоенного действия в рабочую практику.md",
      "AL.P.008 — Проверка утверждения об эффекте обучения.md",
      "AL.P.009 — Проверка образовательного запроса перед проектированием программы.md",
      "AL.P.010 — Выбор и пересмотр индивидуальной образовательной траектории.md",
      "AL.P.011 — Согласование образовательного результата, практического задания и доказательства освоения.md",
      "AL.P.012 — Преобразование опыта взрослого в проверяемое новое действие.md",
      "AL.P.013 — Экосистемное проектирование партнёрской ДПО.md",
      "AL.P.014 — Проектирование проблемного и кейсового обучения.md",
      "AL.P.015 — Безопасный вопрос, предупреждение и замкнутая эскалация.md",
    ];

    for (const fn of patternFilenames) {
      const m = fn.match(/^(AL\.P\.\d{3})\s+—\s+(.+)\.md$/);
      if (!m) continue;
      const entityId = m[1]!;
      const title = m[2]!;
      if (this.index.has(entityId)) {
        const existing = this.index.get(entityId)!;
        existing.path = fn;
        existing.title = title;
      } else {
        this.index.set(entityId, {
          entityId,
          kind: EntityKind.P,
          title,
          summary: "Прикладной паттерн проектирования обучения взрослых",
          status: "pilot",
          pack,
          path: fn,
          commit,
        });
      }
    }

    const scFilenames = ["08-service-clauses/AL.SC.001-evidence-before-claim.md"];
    for (const fn of scFilenames) {
      const m = fn.match(/(AL\.SC\.\d{3})/);
      if (!m) continue;
      const entityId = m[1]!;
      if (!this.index.has(entityId)) {
        this.index.set(entityId, {
          entityId,
          kind: EntityKind.SC,
          title: "Доказательство до заявления об эффекте",
          summary:
            "Услуга, гарантирующая разделение уровней обучения и ограничение силы вывода",
          status: "draft",
          pack,
          path: fn,
          commit,
        });
      } else {
        const existing = this.index.get(entityId)!;
        existing.path = fn;
      }
    }
  }

  private parseDistinctionsIndex(content: string): void {
    const matches = content.matchAll(/^##\s+\[([^\]]+)\]\s+(.+)$/gm);
    for (const m of matches) {
      const entityId = m[1]!;
      const title = m[2]!;
      if (this.index.has(entityId)) {
        const existing = this.index.get(entityId)!;
        existing.title = title;
      }
    }
  }

  private parseWorkProductsIndex(content: string): void {
    const matches = content.matchAll(/^##\s+\[([^\]]+)\]\s+(.+)$/gm);
    for (const m of matches) {
      const entityId = m[1]!;
      const title = m[2]!;
      if (this.index.has(entityId)) {
        const existing = this.index.get(entityId)!;
        existing.title = title;
      }
    }
  }

  private parseFailureModesIndex(content: string): void {
    const lines = content.split(/\r?\n/);
    let inTable = false;
    let headerPassed = false;

    for (const line of lines) {
      if (line.startsWith("# Failure modes")) {
        inTable = true;
        continue;
      }
      if (inTable && line.startsWith("## ")) {
        inTable = false;
        continue;
      }
      if (!inTable) continue;
      if (!line.trim() || !line.startsWith("|")) continue;
      if (!headerPassed) {
        if (line.includes("---")) headerPassed = true;
        continue;
      }
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const [id, name] = cells;
      if (!id || !name) continue;
      if (!this.index.has(id)) {
        this.index.set(id, {
          entityId: id,
          kind: EntityKind.FM,
          title: name,
          summary: "Типовой отказ в практике проектирования обучения взрослых",
          status: "draft",
          pack: PackId.PACK_AL,
          path: "05-failure-modes/failure-modes.md",
          commit: this.packCommits[PackId.PACK_AL],
        });
      }
    }
  }

  private buildStepIndex(): void {
    const stepDefaults: StepIndexEntry[] = [
      {
        stepId: "diagnosis",
        label: "Диагностика образовательного запроса",
        distinctionIds: ["AL.D.002", "AL.D.003", "AL.D.009", "AL.D.011"],
        failureModeIds: ["AL.FM.002", "AL.FM.009", "AL.FM.010"],
        relatedEntityIds: ["AL.M.001", "AL.WP.001", "AL.P.009"],
      },
      {
        stepId: "experience-cycle",
        label: "Проектирование цикла опыт → осмысление → действие",
        distinctionIds: ["AL.D.001", "AL.D.004", "AL.D.006", "AL.D.007"],
        failureModeIds: ["AL.FM.001", "AL.FM.005", "AL.FM.006", "AL.FM.010"],
        relatedEntityIds: ["AL.M.002", "AL.WP.003", "AL.WP.004", "AL.P.004"],
      },
      {
        stepId: "case-learning",
        label: "Проблемно-кейсовое обучение",
        distinctionIds: ["AL.D.005", "AL.D.007", "AL.D.008"],
        failureModeIds: ["AL.FM.003", "AL.FM.004", "AL.FM.006", "AL.FM.008"],
        relatedEntityIds: ["AL.M.003", "AL.WP.004", "AL.WP.005", "AL.P.014"],
      },
      {
        stepId: "self-directed",
        label: "Поддержка самонаправленного обучения",
        distinctionIds: ["AL.D.002", "AL.D.009", "AL.D.010", "AL.D.011"],
        failureModeIds: ["AL.FM.002", "AL.FM.009", "AL.FM.004"],
        relatedEntityIds: ["AL.M.004", "AL.WP.006", "AL.P.002"],
      },
      {
        stepId: "tutoring",
        label: "Тьюторское сопровождение траектории",
        distinctionIds: ["AL.D.001", "AL.D.003", "AL.D.008", "AL.D.009"],
        failureModeIds: ["AL.FM.008", "AL.FM.005", "AL.FM.002"],
        relatedEntityIds: ["AL.M.005", "AL.WP.006", "AL.P.010"],
      },
      {
        stepId: "transfer-design",
        label: "Проектирование переноса в рабочую практику",
        distinctionIds: ["AL.D.007", "AL.D.011", "AL.D.012"],
        failureModeIds: ["AL.FM.007", "AL.FM.006", "AL.FM.004", "AL.FM.010"],
        relatedEntityIds: ["AL.M.006", "AL.WP.007", "AL.P.007", "AL.P.001"],
      },
      {
        stepId: "evaluation",
        label: "Оценивание эффектов обучения",
        distinctionIds: ["AL.D.006", "AL.D.007", "AL.D.012", "AL.D.011"],
        failureModeIds: ["AL.FM.006", "AL.FM.010", "AL.FM.007"],
        relatedEntityIds: [
          "AL.M.007",
          "AL.WP.005",
          "AL.WP.008",
          "AL.P.008",
          "AL.SC.001",
        ],
      },
      {
        stepId: "ecosystem",
        label: "Экосистемное проектирование ДПО",
        distinctionIds: ["AL.D.005", "AL.D.007", "AL.D.003", "AL.D.012"],
        failureModeIds: ["AL.FM.004", "AL.FM.007", "AL.FM.010", "AL.FM.008"],
        relatedEntityIds: ["AL.M.008", "AL.WP.002", "AL.P.013", "AL.SC.001"],
      },
    ];

    for (const s of stepDefaults) {
      this.stepIndex.set(s.stepId, s);
      this.stepIndex.set(
        `AL.STEP.${s.stepId.toUpperCase()}`,
        s,
      );
    }
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-z0-9а-я]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private async getOrFetch(
    pack: PackId,
    filePath: string,
    commit?: string,
  ): Promise<string> {
    const effectiveCommit = commit ?? this.packCommits[pack];
    const cached = this.cache.get(pack, effectiveCommit, filePath);
    if (cached.hit && cached.entry) {
      return cached.entry.content;
    }

    const result = await fetchPackRaw(pack, filePath, effectiveCommit, {
      etag: cached.entry?.etag,
    });

    if (result.status === 304 && cached.entry) {
      return cached.entry.content;
    }

    if (result.status === 404) {
      throw this.notFound(
        Operation.GET_BY_ID,
        undefined,
        `Файл ${filePath} не найден в pack=${pack} commit=${effectiveCommit}`,
      );
    }

    this.cache.setFromFetch(pack, effectiveCommit, filePath, result);
    return result.content;
  }

  private notFound(
    operation: Operation,
    entityId: string | undefined,
    reason: string,
  ): NotFoundError {
    return { code: "NOT_FOUND", operation, entityId, reason };
  }

  private computeScore(
    profile: string,
    step: string,
    question: string,
    entry: IndexEntry,
  ): number {
    const q = question.toLowerCase();
    const p = profile.toLowerCase();
    const s = step.toLowerCase();
    const title = entry.title.toLowerCase();
    const summary = entry.summary.toLowerCase();

    let score = 0;
    const tokens = new Set(
      q
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length >= 3),
    );

    for (const token of tokens) {
      if (title.includes(token)) score += 0.25;
      if (summary.includes(token)) score += 0.1;
      if (entry.entityId.toLowerCase().includes(token)) score += 0.08;
    }

    if (title.includes(p) || summary.includes(p)) score += 0.08;
    if (title.includes(s) || summary.includes(s)) score += 0.08;

    const stepEntry = this.stepIndex.get(step);
    if (stepEntry) {
      if (stepEntry.relatedEntityIds.includes(entry.entityId)) score += 0.15;
      if (stepEntry.distinctionIds.includes(entry.entityId)) score += 0.12;
      if (stepEntry.failureModeIds.includes(entry.entityId)) score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  async search(
    raw: SearchParams,
  ): Promise<KnowledgeResult<SearchResult[]>> {
    let params: SearchParams;
    try {
      params = searchParamsSchema.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: this.notFound(
          Operation.SEARCH,
          undefined,
          `Некорректные параметры поиска: ${e instanceof ZodError ? e.message : String(e)}`,
        ),
      };
    }

    await this.ensureIndexBuilt();

    const results: SearchResult[] = [];
    for (const entry of this.index.values()) {
      const score = this.computeScore(
        params.profile,
        params.step,
        params.question,
        entry,
      );
      if (score <= 0.001) continue;
      results.push({
        entityId: entry.entityId,
        title: entry.title,
        summary: entry.summary,
        status: entry.status,
        pack: entry.pack,
        score: Number(score.toFixed(3)),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return { ok: true, data: results.slice(0, 20) };
  }

  async getById(
    raw: GetByIdParams,
  ): Promise<KnowledgeResult<NormativeBlock>> {
    let params: GetByIdParams;
    try {
      params = getByIdParamsSchema.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_BY_ID,
          raw.entityId,
          `Некорректный параметр entityId: ${e instanceof ZodError ? e.message : String(e)}`,
        ),
      };
    }

    await this.ensureIndexBuilt();

    const entry = this.index.get(params.entityId);
    if (!entry) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_BY_ID,
          params.entityId,
          `Сущность ${params.entityId} не найдена в индексе PACK_AL`,
        ),
      };
    }

    let content: string;
    try {
      content = await this.getOrFetch(entry.pack, entry.path, entry.commit);
    } catch (maybeNotFound) {
      if (
        maybeNotFound &&
        typeof maybeNotFound === "object" &&
        "code" in maybeNotFound &&
        (maybeNotFound as { code?: unknown }).code === "NOT_FOUND"
      ) {
        return { ok: false, error: maybeNotFound as NotFoundError };
      }
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_BY_ID,
          params.entityId,
          `Не удалось загрузить контент для ${params.entityId}: ${String(maybeNotFound)}`,
        ),
      };
    }

    const termCheck = checkTermCompatibility(
      entry.entityId,
      entry.pack,
      entry.path,
      content,
    );
    if (!termCheck.passed) {
      const sample = termCheck.violations[0]!;
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_BY_ID,
          params.entityId,
          `Термин-фильтр ТЗ 6.4: недопустимое сочетание «${sample.matchedPattern}» в ${sample.path}`,
        ),
      };
    }

    const sectionedContent = this.extractEntitySection(
      content,
      entry.entityId,
      entry.kind,
    );
    const finalContent = sectionedContent || content;
    const links = this.extractLinks(finalContent, entry.pack);

    return {
      ok: true,
      data: {
        entityId: entry.entityId,
        title: entry.title,
        kind: entry.kind,
        status: entry.status,
        pack: entry.pack,
        content: finalContent,
        links,
        meta: {
          pack: entry.pack,
          path: entry.path,
          id: entry.entityId,
          commit: entry.commit,
          status: entry.status,
        },
      },
    };
  }

  private extractEntitySection(
    content: string,
    entityId: string,
    kind: EntityKind,
  ): string {
    if (kind !== EntityKind.WP && kind !== EntityKind.D && kind !== EntityKind.FM) {
      return content;
    }

    const lines = content.split(/\r?\n/);
    let startIdx = -1;
    const patterns: RegExp[] = [
      new RegExp(`^##\\s*\\[?${entityId.replace(/\./g, "\\.")}\\]?`),
      new RegExp(`^###\\s*\\[?${entityId.replace(/\./g, "\\.")}\\]?`),
      new RegExp(`^\\|\\s*${entityId.replace(/\./g, "\\.")}\\s*\\|`),
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (patterns.some((p) => p.test(line))) {
        startIdx = kind === EntityKind.FM ? 0 : i;
        break;
      }
    }

    if (startIdx < 0) return "";

    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (/^##\s+\[/.test(line) || /^##\s+Response principles/.test(line)) {
        endIdx = i;
        break;
      }
    }

    return lines.slice(startIdx, endIdx).join("\n").trim();
  }

  private extractLinks(
    content: string,
    _pack: PackId,
  ): NormativeBlock["links"] {
    const links: NormativeBlock["links"] = [];
    const patterns: Array<{ regex: RegExp; rel: string }> = [
      { regex: /Related[:\s]*([^\r\n#]+)/gi, rel: "related" },
      { regex: /Produced by[:\s]*([^\r\n.]+)/gi, rel: "producedBy" },
      { regex: /Consumed by[:\s]*([^\r\n.]+)/gi, rel: "consumedBy" },
      { regex: /depends_on[:\s]*\[([^\]]+)\]/gi, rel: "dependsOn" },
    ];

    const entityIdRegex = /(AL\.[A-Z]+\.\d{3})/g;

    for (const { regex, rel } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = regex.exec(content)) !== null) {
        const chunk = m[1] ?? "";
        let idMatch: RegExpExecArray | null;
        while ((idMatch = entityIdRegex.exec(chunk)) !== null) {
          const targetId = idMatch[1]!;
          if (!links.some((l) => l.targetId === targetId && l.relation === rel)) {
            links.push({ targetId, relation: rel });
          }
        }
      }
    }

    const relatedMatches = content.matchAll(entityIdRegex);
    for (const rm of relatedMatches) {
      const targetId = rm[1]!;
      if (!links.some((l) => l.targetId === targetId)) {
        links.push({ targetId, relation: "reference" });
      }
    }

    return links;
  }

  async getWpSchema(
    raw: GetWpSchemaParams,
  ): Promise<KnowledgeResult<WpSchema>> {
    let params: GetWpSchemaParams;
    try {
      params = getWpSchemaParamsSchema.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_WP_SCHEMA,
          raw.entityId,
          `Некорректный параметр entityId (требуется AL.WP.*): ${e instanceof ZodError ? e.message : String(e)}`,
        ),
      };
    }

    await this.ensureIndexBuilt();

    const entry = this.index.get(params.entityId);
    if (!entry || entry.kind !== EntityKind.WP) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_WP_SCHEMA,
          params.entityId,
          `Рабочий продукт ${params.entityId} не найден или имеет неверный kind (ожидается WP)`,
        ),
      };
    }

    let content: string;
    try {
      content = await this.getOrFetch(entry.pack, entry.path, entry.commit);
    } catch (maybeNotFound) {
      if (
        maybeNotFound &&
        typeof maybeNotFound === "object" &&
        "code" in maybeNotFound &&
        (maybeNotFound as { code?: unknown }).code === "NOT_FOUND"
      ) {
        return { ok: false, error: maybeNotFound as NotFoundError };
      }
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_WP_SCHEMA,
          params.entityId,
          String(maybeNotFound),
        ),
      };
    }

    const termCheck = checkTermCompatibility(
      entry.entityId,
      entry.pack,
      entry.path,
      content,
    );
    if (!termCheck.passed) {
      const sample = termCheck.violations[0]!;
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_WP_SCHEMA,
          params.entityId,
          `Термин-фильтр ТЗ 6.4: недопустимое сочетание «${sample.matchedPattern}»`,
        ),
      };
    }

    const schema = this.parseWpSchemaFromContent(
      content,
      entry.entityId,
      entry.title,
      entry.pack,
    );
    return { ok: true, data: schema };
  }

  private parseWpSchemaFromContent(
    content: string,
    entityId: string,
    fallbackTitle: string,
    pack: PackId,
  ): WpSchema {
    const section = this.extractEntitySection(content, entityId, EntityKind.WP);
    const src = section || content;

    const defMatch = src.match(/\*\*Definition:\*\*([^\r\n]+)/i);
    const producedMatch = src.match(/\*\*Produced by:\*\*([^.*]+)/i);
    const consumedMatch = src.match(/\*\*Consumed by:\*\*([^.*\r\n]+)/i);

    const idRegex = /(AL\.[A-Z]+\.\d{3})/g;
    const producedBy: string[] = [];
    const consumedBy: string[] = [];

    if (producedMatch) {
      let m;
      while ((m = idRegex.exec(producedMatch[1] ?? "")) !== null) {
        producedBy.push(m[1]!);
      }
    }
    if (consumedMatch) {
      let m;
      while ((m = idRegex.exec(consumedMatch[1] ?? "")) !== null) {
        consumedBy.push(m[1]!);
      }
    }

    let title = fallbackTitle;
    const titleMatch = src.match(/^##\s*\[[^\]]+\]\s+(.+)$/m);
    if (titleMatch) title = titleMatch[1]!.trim();

    const dodMatch = src.match(/\*\*Definition of Done\*\*([\s\S]*?)(?=\*\*Anti-patterns|\*\*Produced|\*\*Consumed|##\s|$)/i);
    const dodText = dodMatch ? dodMatch[1] ?? "" : "";

    const antiMatch = src.match(/\*\*Anti-patterns:\*\*([\s\S]*?)(?=##\s|$)/i);
    const antiText = antiMatch ? antiMatch[1] ?? "" : "";
    const antiPatterns = antiText
      .split(/;|\r?\n/)
      .map((s) => s.trim().replace(/^—\s*/, "").replace(/^«|»$/g, ""))
      .filter((s) => s.length >= 4);

    const rawDodItems = dodText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-"))
      .map((l) => l.replace(/^-\s*/, ""));

    const fields = this.inferWpFields(entityId);
    const rules = rawDodItems.map((desc, i) => ({
      id: `${entityId}:RULE-${String(i + 1).padStart(3, "0")}`,
      description: desc,
      severity: desc.includes("обязан") || desc.includes("указан") ? ("must" as const) : ("should" as const),
    }));
    const checks = rawDodItems.map((desc, i) => ({
      id: `${entityId}:CHECK-${String(i + 1).padStart(3, "0")}`,
      question: `Выполнено ли условие DoD?`,
      passCriteria: desc,
    }));

    return {
      entityId,
      title,
      pack,
      definition: (defMatch?.[1] ?? fallbackTitle).trim(),
      producedBy,
      consumedBy,
      fields,
      rules,
      checks,
      antiPatterns,
    };
  }

  private inferWpFields(entityId: string): WpSchema["fields"] {
    const common = [
      { name: "meta.entityId", type: "string" as const, required: true, description: "ID рабочего продукта" },
      { name: "meta.author", type: "string" as const, required: true, description: "Владелец/автор WP" },
      { name: "meta.createdAt", type: "string" as const, required: true, description: "Дата создания" },
      { name: "meta.revision", type: "string" as const, required: false, description: "Ревизия/версия" },
    ];

    const byWp: Record<string, WpSchema["fields"]> = {
      "AL.WP.001": [
        { name: "subject.role", type: "string" as const, required: true, description: "Субъект запроса (функциональная роль)" },
        { name: "target.action", type: "text" as const, required: true, description: "Требуемое действие" },
        { name: "target.context", type: "text" as const, required: true, description: "Контекст применения" },
        { name: "gap.currentAction", type: "text" as const, required: true, description: "Текущее действие с основаниями" },
        { name: "gap.evidence.pro" , type: "array" as const, required: false, description: "Данные за гипотезу" },
        { name: "gap.evidence.contra" , type: "array" as const, required: false, description: "Данные против гипотезы" },
        { name: "solution.type", type: "enum" as const, required: true, description: "Тип решения", enumValues: ["обучение", "обучение+среда", "неучебное изменение", "дополнительная диагностика", "отказ"] },
      ],
      "AL.WP.002": [
        { name: "outcomes", type: "array" as const, required: true, description: "Целевые действия (наблюдаемые)" },
        { name: "outcome.abilityMode", type: "enum" as const, required: true, description: "Режим способности", enumValues: ["самостоятельный", "совместный", "ответственный с инструментом/ИИ"] },
        { name: "evidenceMap", type: "object" as const, required: true, description: "Связи результат -> доказательство -> свойство задания" },
        { name: "stakeholder.split", type: "array" as const, required: false, description: "Разделение результатов по сторонам" },
      ],
      "AL.WP.003": [
        { name: "sequence.phases", type: "array" as const, required: true, description: "Фазы цикла: опыт, осмысление, концептуализация, действие" },
        { name: "supportPoints", type: "array" as const, required: false, description: "Точки поддержки и подсказок" },
        { name: "reflection.mode", type: "enum" as const, required: true, description: "Режим рефлексии", enumValues: ["анонимный", "конфиденциальный", "открытый"] },
        { name: "complexity.heldComponents", type: "array" as const, required: true, description: "Элементы сложности, удерживаемые участником" },
      ],
      "AL.WP.004": [
        { name: "task.authenticity", type: "object" as const, required: true, description: "Соответствие целевой деятельности" },
        { name: "task.mode", type: "enum" as const, required: true, description: "Режим доступа", enumValues: ["без ИИ/образца", "с образцом", "с ИИ ответственно"] },
        { name: "criteria.visibility", type: "boolean" as const, required: true, description: "Критерии известны до выполнения" },
        { name: "product.observability", type: "text" as const, required: true, description: "Как наблюдается и проверяется продукт" },
      ],
      "AL.WP.005": [
        { name: "criteriaLevels", type: "array" as const, required: true, description: "Критерии и уровни с наблюдаемыми признаками" },
        { name: "dataSources", type: "array" as const, required: true, description: "Источники данных по силе вывода" },
        { name: "function.type", type: "enum" as const, required: true, description: "Функция измерения", enumValues: ["обучение", "формирующая диагностика", "итоговое оценивание", "ответственность"] },
        { name: "boundary.alternativeExplanations", type: "array" as const, required: false, description: "Альтернативные объяснения" },
      ],
      "AL.WP.006": [
        { name: "trajectory.components", type: "array" as const, required: true, description: "Компоненты маршрута" },
        { name: "adaptation.rules", type: "array" as const, required: true, description: "Правила адаптации: данные/компонент/правило" },
        { name: "support.level", type: "object" as const, required: true, description: "Объём поддержки по готовности" },
        { name: "escalation.path", type: "object" as const, required: false, description: "Маршрут эскалации сигналов угрозы" },
      ],
      "AL.WP.007": [
        { name: "change.owner", type: "string" as const, required: true, description: "Владелец изменения" },
        { name: "change.targetRoles", type: "array" as const, required: true, description: "Целевые роли/площадки" },
        { name: "mechanism.essential", type: "text" as const, required: true, description: "Существенный механизм" },
        { name: "admission.allowedAdaptations", type: "array" as const, required: false, description: "Допустимые адаптации" },
        { name: "verification.sustainabilityWindow", type: "string" as const, required: true, description: "Окно проверки устойчивости" },
      ],
      "AL.WP.008": [
        { name: "chain.linkData", type: "array" as const, required: true, description: "Данные по звеньям: вывод→изменение→внедрение→соблюдение→результат→устойчивость→перенос" },
        { name: "metrics.denominator", type: "object" as const, required: true, description: "Знаменатель/экспозиция для каждого показателя" },
        { name: "boundary.firstGap", type: "string" as const, required: true, description: "Первое звено без достаточных данных" },
        { name: "conclusion.strengthLimit", type: "text" as const, required: true, description: "Ограничение силы вывода" },
      ],
    };

    return [...common, ...(byWp[entityId] ?? [])];
  }

  async getDistinctions(
    raw: GetDistinctionsParams,
  ): Promise<KnowledgeResult<DistinctionsBundle>> {
    let params: GetDistinctionsParams;
    try {
      params = getDistinctionsParamsSchema.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          operation: Operation.GET_DISTINCTIONS,
          stepId: raw.stepId,
          reason: `Некорректный параметр stepId: ${e instanceof ZodError ? e.message : String(e)}`,
        },
      };
    }

    await this.ensureIndexBuilt();

    const step = this.stepIndex.get(params.stepId);
    if (!step) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          operation: Operation.GET_DISTINCTIONS,
          stepId: params.stepId,
          reason: `Шаг ${params.stepId} не найден в индексе шагов. Доступные шаги: ${Array.from(this.stepIndex.keys()).join(", ")}`,
        },
      };
    }

    const distinctionsContent = await this.getOrFetch(
      PackId.PACK_AL,
      "01-domain-contract/01B-distinctions.md",
    );
    const fmContent = await this.getOrFetch(
      PackId.PACK_AL,
      "05-failure-modes/failure-modes.md",
    );

    const termCheckD = checkTermCompatibility(
      "AL.D.BUNDLE",
      PackId.PACK_AL,
      "01-domain-contract/01B-distinctions.md",
      distinctionsContent,
    );
    if (!termCheckD.passed) {
      const sample = termCheckD.violations[0]!;
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          operation: Operation.GET_DISTINCTIONS,
          stepId: params.stepId,
          reason: `Термин-фильтр в distinctions: недопустимое сочетание «${sample.matchedPattern}»`,
        },
      };
    }

    const distinctions: DistinctionEntry[] = [];
    for (const id of step.distinctionIds) {
      const parsed = this.parseSingleDistinction(distinctionsContent, id);
      if (parsed) distinctions.push(parsed);
    }

    const commonFailureModes: CommonFailureMode[] = [];
    for (const id of step.failureModeIds) {
      const parsed = this.parseSingleFailureMode(fmContent, id);
      if (parsed) commonFailureModes.push(parsed);
    }

    return {
      ok: true,
      data: { stepId: params.stepId, distinctions, commonFailureModes },
    };
  }

  private parseSingleDistinction(
    content: string,
    entityId: string,
  ): DistinctionEntry | null {
    const entry = this.index.get(entityId);
    if (!entry || entry.kind !== EntityKind.D) return null;

    const section = this.extractEntitySection(content, entityId, EntityKind.D);
    if (!section) return null;

    const defMatch = section.match(/\*\*Определение:\*\*([^\r\n]+)/i);
    const whyMatch = section.match(/\*\*Почему важно:\*\*([^\r\n]+)/i);
    const relatedMatch = section.match(/\*\*Related:\*\*([^\r\n]+)/i);
    const revMatch = section.match(/\*\*Revision criterion:\*\*([^\r\n]+)/i);

    const contrastPairs: DistinctionEntry["contrastPairs"] = [];
    const tableMatch = section.match(/\|([^\r\n|]+)\|\s*vs\.\*\|([^\r\n|]+)\|/gi);
    if (tableMatch) {
      for (const tm of tableMatch) {
        const cells = tm.split("|").map((c) => c.trim());
        const sideA = (cells[1] ?? "").replace(/\*\*/g, "").trim();
        const sideB = (cells[3] ?? "").replace(/\*\*/g, "").replace(/^vs\.?\s*/i, "").trim();
        if (sideA && sideB) contrastPairs.push({ sideA, sideB });
      }
    }
    if (contrastPairs.length === 0) {
      const anyTable = section.match(/\|(.+?)\|(.+?)\|/g);
      if (anyTable) {
        for (const row of anyTable) {
          const cells = row.split("|").map((c) => c.trim());
          if (cells.length >= 4 && /vs/i.test(cells[2] ?? "")) {
            const sideA = (cells[1] ?? "").replace(/\*\*/g, "").trim();
            const sideB = (cells[3] ?? "").replace(/\*\*/g, "").trim();
            if (sideA && sideB && sideA !== "---" && sideB !== "---") {
              contrastPairs.push({ sideA, sideB });
            }
          }
        }
      }
    }

    const idRegex = /(AL\.[A-Z]+\.\d{3})/g;
    const related: string[] = [];
    if (relatedMatch) {
      let m;
      while ((m = idRegex.exec(relatedMatch[1] ?? "")) !== null) {
        related.push(m[1]!);
      }
    }

    return {
      entityId,
      title: entry.title,
      status: entry.status,
      pack: entry.pack,
      definition: (defMatch?.[1] ?? entry.summary).trim(),
      contrastPairs,
      whyImportant: (whyMatch?.[1] ?? "").trim(),
      related,
      revisionCriterion: revMatch?.[1]?.trim() || undefined,
    };
  }

  private parseSingleFailureMode(
    content: string,
    entityId: string,
  ): CommonFailureMode | null {
    const entry = this.index.get(entityId);
    if (!entry || entry.kind !== EntityKind.FM) return null;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith(`| ${entityId} |`)) continue;
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const [, name, , symptom, rootCause, mitigation] = cells;
      return {
        entityId,
        title: name ?? entry.title,
        status: entry.status,
        pack: entry.pack,
        description: entry.summary,
        symptom: symptom ?? "",
        rootCause: rootCause ?? "",
        mitigation: mitigation ?? "",
      };
    }
    return {
      entityId,
      title: entry.title,
      status: entry.status,
      pack: entry.pack,
      description: entry.summary,
      symptom: "",
      rootCause: "",
      mitigation: "",
    };
  }

  async getSourceMeta(
    raw: GetSourceMetaParams,
  ): Promise<KnowledgeResult<EntityMeta>> {
    let params: GetSourceMetaParams;
    try {
      params = getSourceMetaParamsSchema.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_SOURCE_META,
          raw.entityId,
          `Некорректный параметр entityId: ${e instanceof ZodError ? e.message : String(e)}`,
        ),
      };
    }

    await this.ensureIndexBuilt();

    const entry = this.index.get(params.entityId);
    if (!entry) {
      return {
        ok: false,
        error: this.notFound(
          Operation.GET_SOURCE_META,
          params.entityId,
          `Метаданные для ${params.entityId} отсутствуют в индексе`,
        ),
      };
    }

    return {
      ok: true,
      data: {
        pack: entry.pack,
        path: entry.path,
        id: entry.entityId,
        commit: entry.commit,
        status: entry.status,
      },
    };
  }
}

let _instance: McpKnowledgeClient | null = null;

export function getMcpClient(
  explicitRootDir?: string,
): McpKnowledgeClient {
  if (_instance) return _instance;
  const root =
    explicitRootDir ??
    (typeof process !== "undefined" && typeof process.cwd === "function"
      ? path.resolve(process.cwd(), "rbte")
      : path.resolve(".", "rbte"));
  _instance = new McpKnowledgeClient(root);
  return _instance;
}

export default getMcpClient;
