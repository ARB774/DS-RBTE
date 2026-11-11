import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const output = join(app, 'lib/value-proposition-evidence.json');
const checkOnly = process.argv.includes('--check');
const base = 'Предложение ценности B2B/';
const paths = {
  core: base + 'Постоянное ядро наставника.md',
  state: base + 'Карточка состояния наставника.md',
  cloud: base + 'Оперативный модуль работы с Тучей.md',
  specification: base + 'Техническое задание на наставничество обучающегося по теме Разработка предложения ценности на B2B-рынке.md',
};
const canonicalPaths = Object.values(paths);

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trimEnd();
}

// Code-only commits do not change the documentation revision.
const revision = git(['log', '-1', '--format=%H', '--', ...canonicalPaths]);
if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Cannot resolve canonical mentor documentation revision');

function sourceAtRevision(path) {
  return git(['show', `${revision}:${path}`]).replace(/\r\n/g, '\n') + '\n';
}

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

function exactSection(text, startHeading, endHeading) {
  const lines = text.replace(/\n$/, '').split('\n');
  const start = lines.indexOf(startHeading);
  if (start < 0) throw new Error(`Missing mentor section start: ${startHeading}`);
  const end = endHeading
    ? lines.indexOf(endHeading, start + 1)
    : lines.findIndex((line, index) => index > start && /^## /.test(line));
  if (end < 0 || end <= start) throw new Error(`Missing mentor section end after: ${startHeading}`);
  return { start: start + 1, end, text: lines.slice(start, end).join('\n') };
}

const documents = new Map(canonicalPaths.map(path => [path, sourceAtRevision(path)]));
const records = [];
function addFull(id, path, stages) {
  const text = documents.get(path);
  records.push({ id, repo: 'ARB774/DS-RBTE', commit: revision, path, sha256: digest(text), range: 'full', stages, text });
}
function addSection(id, path, stages, startHeading, endHeading) {
  const document = documents.get(path);
  const section = exactSection(document, startHeading, endHeading);
  records.push({ id, repo: 'ARB774/DS-RBTE', commit: revision, path, sha256: digest(document), range: `L${section.start}-L${section.end}`, stages, text: section.text });
}

addFull('DS-RBTE.CORE', paths.core, ['*']);
addFull('DS-RBTE.STATE', paths.state, ['*']);
addFull('DS-RBTE.CLOUD-DISPLAY', paths.cloud, ['S5']);

const tz = paths.specification;
addSection('DS-RBTE.SESSION', tz, ['*'], '### 10.1. Восстановить контекст', '### 10.2. Получить след действия');
addSection('DS-RBTE.FORMULATION', tz, ['*'], '#### 10.5.1. Исправлять формулировку, не подменяя участника', '### 10.6. Вернуть действие участнику');
addSection('DS-RBTE.S0-S2', tz, ['S0', 'S1', 'S2'], '### `S0–S2`. Выбор B2B-поля', '### `S3`. Проверка профиля');
addSection('DS-RBTE.S0', tz, ['S0'], '#### Ход 1. Открыть тренировку и договориться о результате', '#### Ход 3. Установить системный повод');
addSection('DS-RBTE.S1', tz, ['S1'], '#### Ход 4. Получить исходное представление о клиенте — `S1`', '#### Ход 5. Выбрать поле исследования — `S1 → S2`');
addSection('DS-RBTE.S2', tz, ['S2'], '#### Ход 5. Выбрать поле исследования — `S1 → S2`', '#### Ход 10. Собрать предварительный профиль — `S3`');
addSection('DS-RBTE.S3', tz, ['S3'], '#### Ход 10. Собрать предварительный профиль — `S3`', '#### Ход 13. Закрыть тренировку и принять решение о переходе');
addSection('DS-RBTE.S4', tz, ['S4'], '#### Цикл 1. Объяснить задачу и восстановить границу', '#### Допуск наставника к построению тучи');
addSection('DS-RBTE.S5', tz, ['S5'], '#### Допуск наставника к построению тучи', '### `S6`. Корневой конфликт и предположения');
addSection('DS-RBTE.S6.COMMON', tz, ['S6.1', 'S6.2', 'S6.3'], '### `S6`. Корневой конфликт и предположения', '#### `S6.1`. Сбор и формулирование предположений');
addSection('DS-RBTE.S6.1', tz, ['S6.1'], '#### `S6.1`. Сбор и формулирование предположений', '#### `S6.2`. Постановка предположений под сомнение');
addSection('DS-RBTE.S6.2', tz, ['S6.2'], '#### `S6.2`. Постановка предположений под сомнение', '#### `S6.3`. Выбор ограничивающих предположений');
addSection('DS-RBTE.S6.3', tz, ['S6.3'], '#### `S6.3`. Выбор ограничивающих предположений', '### `S7`. Решение');
addSection('DS-RBTE.S7', tz, ['S7'], '### `S7`. Решение', '### `S8`. Проект предложения');
addSection('DS-RBTE.S8', tz, ['S8'], '### `S8`. Проект предложения', '### `S9`. Проверка на представителях сегмента');
addSection('DS-RBTE.S9', tz, ['S9'], '### `S9`. Проверка на представителях сегмента', '### `S10`. Граница обещания');
addSection('DS-RBTE.S10', tz, ['S10'], '### `S10`. Граница обещания', '### `S11`. Отчёт о разработке предложения ценности');
addSection('DS-RBTE.S11', tz, ['S11'], '### `S11`. Отчёт о разработке предложения ценности', '## 14. Работа с затруднениями участника');

const packManifest = JSON.parse(readFileSync(join(app, 'lib/pack-toc-sources.json'), 'utf8'));
const packStages = [
  ['TOC.M.003', ['S5', 'S6.1', 'S6.2', 'S6.3']],
  ['TOC.M.004', ['S6.1', 'S6.2', 'S6.3']],
  ['TOCT.6', ['S6.1', 'S6.2', 'S6.3']],
  ['TOCT.7', ['S7', 'S8']],
  ['TOC.WP.003', ['S6.1', 'S6.2', 'S6.3']],
  ['TOC.WP.006', ['S7', 'S8']],
  ['TOC.WP.004', ['S5']],
  ['TOC.DOC.040', ['S5']],
  ['TOC.D.008', ['S6.1', 'S6.2', 'S6.3']],
];
for (const [id, stages] of packStages) {
  const source = packManifest.sources[id];
  if (!source) throw new Error(`Missing Pack-TOC source: ${id}`);
  const text = readFileSync(join(app, 'knowledge/pack-toc', source.path), 'utf8').replace(/\r\n/g, '\n');
  records.push({ id, repo: packManifest.repo, commit: packManifest.commit, path: source.path, sha256: digest(text), range: 'full', stages, text });
}

const generated = JSON.stringify(records, null, 2) + '\n';
if (checkOnly) {
  const current = readFileSync(output, 'utf8');
  if (current !== generated) {
    console.error(`Mentor documentation bundle is stale. Run: node scripts/build-mentor-evidence.mjs\nExpected DS-RBTE revision: ${revision}`);
    process.exitCode = 1;
  } else {
    console.log(`Mentor documentation bundle is current: DS-RBTE ${revision}`);
  }
} else {
  writeFileSync(output, generated, 'utf8');
  console.log(`Updated mentor documentation bundle: DS-RBTE ${revision}`);
}
