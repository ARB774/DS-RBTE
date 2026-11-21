import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { publishCloudImage, readCloudImage } from "../cloud-data.mjs";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

test("reads a PNG inside the allowed root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toc-cloud-"));
  try {
    const imagePath = path.join(root, "cloud.png");
    await writeFile(imagePath, ONE_PIXEL_PNG);
    const result = await readCloudImage(imagePath, { allowedRoot: root });

    assert.equal(result.mimeType, "image/png");
    assert.equal(result.fileName, "cloud.png");
    assert.match(result.dataUrl, /^data:image\/png;base64,/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects paths outside the allowed root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toc-cloud-root-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "toc-cloud-outside-"));
  try {
    const imagePath = path.join(outside, "cloud.png");
    await writeFile(imagePath, ONE_PIXEL_PNG);
    await assert.rejects(
      readCloudImage(imagePath, { allowedRoot: root }),
      /должен находиться внутри/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("publishes the current PNG for the browser viewer", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "toc-cloud-browser-"));
  try {
    const imagePath = path.join(root, "cloud.png");
    const outputPath = path.join(root, "public", "cloud-current.png");
    await writeFile(imagePath, ONE_PIXEL_PNG);

    const image = await readCloudImage(imagePath, { allowedRoot: root });
    const published = await publishCloudImage(image, outputPath);

    assert.equal(published.outputPath, outputPath);
    assert.deepEqual(await readFile(outputPath), ONE_PIXEL_PNG);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
