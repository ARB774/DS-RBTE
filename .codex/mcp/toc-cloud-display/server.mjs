import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { publishCloudImage, readCloudImage } from "./cloud-data.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const UI_URI = "ui://toc-cloud-display/cloud-view-v1.html";
const browserViewPath = path.join(moduleDir, "public", "cloud-view.html");
const browserImagePath = path.join(moduleDir, "public", "cloud-current.png");
const cloudViewHtml = await readFile(
  browserViewPath,
  "utf8"
);

export function createServer() {
  const server = new McpServer({
    name: "toc-cloud-display",
    version: "0.1.0",
  });

  registerAppResource(
    server,
    "toc-cloud-view",
    UI_URI,
    {},
    async () => ({
      contents: [
        {
          uri: UI_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: cloudViewHtml,
          _meta: {
            ui: {
              prefersBorder: false,
            },
            "openai/ui": {
              availableDisplayModes: ["inline"],
              preferredDisplayMode: "inline",
            },
          },
        },
      ],
    })
  );

  registerAppTool(
    server,
    "show_cloud",
    {
      title: "Показать Тучу ТОС",
      description:
        "Обновляет готовую Тучу ТОС в постоянно открытом окне браузера. " +
        "Используй этот инструмент перед каждым вопросом о Туче.",
      inputSchema: {
        image_path: z.string().min(1).describe("Абсолютный путь к PNG или SVG Тучи"),
        title: z.string().min(1).optional().describe("Короткий заголовок над Тучей"),
        version: z.string().min(1).optional().describe("Номер или статус версии Тучи"),
      },
      outputSchema: {
        title: z.string(),
        version: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        byteSize: z.number(),
        browserViewPath: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: UI_URI },
        "openai/ui": {
          preferredModelDisplayMode: "inline",
        },
        "openai/outputTemplate": UI_URI,
        "openai/toolInvocation/invoking": "Показываю Тучу",
        "openai/toolInvocation/invoked": "Туча показана",
      },
    },
    async ({ image_path, title, version }) => {
      try {
        const image = await readCloudImage(image_path);
        await publishCloudImage(image, browserImagePath);
        const structuredContent = {
          title: title?.trim() || "Текущая Туча",
          version: version?.trim() || "актуальная версия",
          fileName: image.fileName,
          mimeType: image.mimeType,
          byteSize: image.byteSize,
          browserViewPath,
        };

        return {
          content: [
            {
              type: "image",
              data: image.dataUrl.slice(image.dataUrl.indexOf(",") + 1),
              mimeType: image.mimeType,
            },
            {
              type: "text",
              text: `Окно браузера обновлено: ${browserViewPath}`,
            },
          ],
          structuredContent,
          _meta: {
            cloud: {
              dataUrl: image.dataUrl,
              title: structuredContent.title,
              version: structuredContent.version,
              browserViewPath,
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text", text: `Тучу показать не удалось: ${message}` }],
        };
      }
    }
  );

  return server;
}

export async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
