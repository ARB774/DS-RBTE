"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ValuePropositionDiagram,
} from "@/lib/value-proposition-visualization";

type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };

const nodeTypeLabels: Record<ValuePropositionDiagram["nodes"][number]["type"], string> = {
  goal: "Цель",
  need: "Необходимое условие",
  action: "Действие",
  statement: "Утверждение",
  ude: "НЖЯ",
  assumption: "Предположение",
  solution: "Решение",
  injection: "Инъекция",
  prediction: "Прогноз",
  risk: "Риск",
  evidence: "Свидетельство",
  boundary: "Граница",
  and: "И",
  unknown: "Не установлено",
};

const statusLabels: Record<ValuePropositionDiagram["nodes"][number]["status"], string> = {
  accepted: "принято",
  candidate: "кандидат",
  checking: "проверяется",
  hypothesis: "гипотеза связи",
  unknown: "неизвестно",
  rejected: "исключено",
};

const edgeColors: Record<ValuePropositionDiagram["edges"][number]["kind"], string> = {
  cause: "#2563eb",
  necessity: "#334155",
  support: "#15803d",
  conflict: "#dc2626",
  gap: "#7c3aed",
};

function boundaryPoint(from: Box, toward: Point): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return { x: from.x, y: from.y };
  const halfWidth = from.width / 2;
  const halfHeight = from.height / 2;
  const scale = Math.min(halfWidth / Math.max(Math.abs(dx), 0.001), halfHeight / Math.max(Math.abs(dy), 0.001));
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function edgePath(from: Box, to: Box, conflict: boolean): string {
  const start = boundaryPoint(from, to);
  const end = boundaryPoint(to, from);
  if (!conflict) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const nx = -dy / length;
  const ny = dx / length;
  const first = { x: start.x + dx * 0.43 + nx * 10, y: start.y + dy * 0.43 + ny * 10 };
  const second = { x: start.x + dx * 0.57 - nx * 10, y: start.y + dy * 0.57 - ny * 10 };
  return `M ${start.x} ${start.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${end.x} ${end.y}`;
}

export function ValuePropositionDiagramView({ diagram }: { diagram: ValuePropositionDiagram }) {
  const root = useRef<HTMLDivElement>(null);
  const markerPrefix = useId().replace(/:/g, "");
  const maxRank = Math.max(0, ...diagram.nodes.map((node) => node.rank));
  const maxOrder = Math.max(0, ...diagram.nodes.map((node) => node.order));
  const width = Math.max(760, (maxOrder + 1) * 300 + 80);
  const height = Math.max(360, (maxRank + 1) * 180 + 90);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});

  useEffect(() => {
    const canvas = root.current;
    if (!canvas) return;
    const update = () => {
      const origin = canvas.getBoundingClientRect();
      const next: Record<string, Box> = {};
      canvas.querySelectorAll<HTMLElement>("[data-vp-node]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        next[element.dataset.vpNode ?? ""] = {
          x: (rect.left + rect.right) / 2 - origin.left,
          y: (rect.top + rect.bottom) / 2 - origin.top,
          width: rect.width,
          height: rect.height,
        };
      });
      setBoxes(next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    canvas.querySelectorAll("[data-vp-node]").forEach((element) => observer.observe(element));
    update();
    return () => observer.disconnect();
  }, [diagram]);

  const paths = useMemo(() => diagram.edges.flatMap((edge) => {
    const from = boxes[edge.from];
    const to = boxes[edge.to];
    return from && to ? [{ edge, path: edgePath(from, to, edge.kind === "conflict") }] : [];
  }), [boxes, diagram.edges]);

  return <section className="space-y-3" aria-label={diagram.title}>
    <div>
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="font-bold text-lg">{diagram.title}</h2><p className="text-sm text-[#526072] mt-1">{diagram.purpose}</p></div>
        <span className="badge shrink-0">версия {diagram.version}</span>
      </div>
    </div>
    <div className="overflow-auto rounded-xl border border-[#d9dfeb] bg-[#fbfcff]">
      <div ref={root} className="relative" style={{ width, height }}>
        <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
          <defs>
            {Object.entries(edgeColors).map(([kind, color]) => <marker key={kind} id={`${markerPrefix}-${kind}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill={color} /></marker>)}
          </defs>
          {paths.map(({ edge, path }) => {
            const active = diagram.activeElementId === edge.id;
            return <g key={edge.id}>
              <path
                d={path}
                fill="none"
                stroke={edgeColors[edge.kind]}
                strokeWidth={active ? 4 : edge.kind === "conflict" ? 3 : 2.2}
                strokeDasharray={edge.status === "accepted" ? undefined : edge.kind === "gap" ? "3 5" : "8 6"}
                markerEnd={`url(#${markerPrefix}-${edge.kind})`}
                markerStart={edge.kind === "conflict" ? `url(#${markerPrefix}-${edge.kind})` : undefined}
              />
              {edge.label && <text x={(boxes[edge.from].x + boxes[edge.to].x) / 2} y={(boxes[edge.from].y + boxes[edge.to].y) / 2 - 8} textAnchor="middle" className="fill-[#475569] text-[12px] font-semibold">{edge.label}</text>}
            </g>;
          })}
        </svg>
        {diagram.nodes.map((node) => {
          const isAnd = node.type === "and";
          const active = diagram.activeElementId === node.id;
          const top = 34 + (maxRank - node.rank) * 170;
          const left = 40 + node.order * 300;
          return <article
            key={node.id}
            data-vp-node={node.id}
            className={`absolute z-10 border-2 bg-white shadow-sm ${active ? "ring-4 ring-[#fbbf24]/50" : ""} ${node.status === "rejected" ? "opacity-55" : ""}`}
            style={{
              top,
              left,
              width: isAnd ? 64 : 250,
              minHeight: isAnd ? 64 : 104,
              borderRadius: isAnd ? 999 : 16,
              borderColor: node.type === "ude" || node.type === "risk" ? "#dc2626" : node.type === "solution" || node.type === "injection" ? "#0284c7" : node.type === "need" ? "#15803d" : node.status === "unknown" ? "#7c3aed" : "#64748b",
              padding: isAnd ? 0 : "12px 14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: isAnd ? "center" : "stretch",
            }}
          >
            {isAnd ? <strong className="text-xl">И</strong> : <>
              <div className="flex gap-2 justify-between items-start text-[11px] font-bold uppercase tracking-wide text-[#526072]"><span>{nodeTypeLabels[node.type]}</span><span>{statusLabels[node.status]}</span></div>
              <p className="mt-2 text-[15px] leading-5 font-semibold whitespace-pre-wrap">{node.label}</p>
            </>}
          </article>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#526072]">
      <span><b className="text-[#2563eb]">→</b> причина</span>
      <span><b className="text-[#334155]">→</b> необходимость</span>
      <span><b className="text-[#dc2626]">↔</b> конфликт</span>
      <span>пунктир — не проверено</span>
    </div>
  </section>;
}

/** A lightweight drawing; the full interactive canvas mounts only when opened. */
export function ValuePropositionDiagramPreview({ diagram }: { diagram: ValuePropositionDiagram }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const maxRank = Math.max(0, ...diagram.nodes.map(node => node.rank));
  const maxOrder = Math.max(0, ...diagram.nodes.map(node => node.order));
  const width = (maxOrder + 1) * 300 + 40;
  const height = (maxRank + 1) * 160 + 40;
  const positions = new Map(diagram.nodes.map(node => [node.id, {
    x: 20 + node.order * 300, y: 20 + (maxRank - node.rank) * 160,
  }]));
  return <div className="my-3 min-w-0">
    <button type="button" aria-expanded={open} aria-controls={contentId}
      onClick={() => setOpen(value => !value)}
      className="block w-full max-w-sm rounded-xl border border-[#cbd5e1] bg-white p-3 text-left hover:border-[#2563eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      <span className="flex items-start justify-between gap-3 text-sm font-semibold">
        <span>{diagram.title}</span><span className="shrink-0 text-xs text-[#526072]">в. {diagram.version}</span>
      </span>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-28 w-full rounded-lg bg-[#fbfcff]" aria-hidden="true">
        {diagram.edges.map(edge => {
          const from = positions.get(edge.from), to = positions.get(edge.to);
          return from && to ? <line key={edge.id} x1={from.x + 125} y1={from.y + 50} x2={to.x + 125} y2={to.y + 50}
            stroke={edgeColors[edge.kind]} strokeWidth={4} strokeDasharray={edge.status === 'accepted' ? undefined : '10 6'} /> : null;
        })}
        {diagram.nodes.map(node => {
          const point = positions.get(node.id)!;
          return <g key={node.id}>
            <rect x={point.x} y={point.y} width={250} height={100} rx={14} fill="white"
              stroke={node.type === 'ude' || node.type === 'risk' ? '#dc2626' : node.type === 'need' ? '#15803d' : '#64748b'} strokeWidth={3} />
            <text x={point.x + 12} y={point.y + 30} fill="#526072" fontSize={16}>{nodeTypeLabels[node.type]}</text>
            <text x={point.x + 12} y={point.y + 65} fill="#1e293b" fontSize={18}>{node.label.slice(0, 20)}{node.label.length > 20 ? '…' : ''}</text>
          </g>;
        })}
      </svg>
      <span className="mt-2 block text-xs text-[#526072]">{open ? 'Свернуть рисунок ↑' : 'Развернуть рисунок в диалоге ↓'}</span>
    </button>
    <div id={contentId} hidden={!open} className="mt-3 min-w-0">
      {open && <ValuePropositionDiagramView diagram={diagram} />}
    </div>
  </div>;
}
