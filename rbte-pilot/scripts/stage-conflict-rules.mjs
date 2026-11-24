import { copyFile, mkdir } from 'node:fs/promises';

const output = new URL('../knowledge/conflict-rules/', import.meta.url);
await mkdir(output, { recursive: true });
for (const name of [
  'Общий навык помощников.md',
  'Критерии приёмки профиля Конфликт сторон.md',
  'ТЗ помощника по построению Тучи конфликта сторон.md',
]) {
  await copyFile(new URL('../../WP-45/' + name, import.meta.url), new URL(name, output));
}
