import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

type Direction = "LR" | "TB";

interface LayoutOptions {
  direction?: Direction;
  defaultWidth?: number;
  defaultHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

/**
 * Runs a Dagre layered layout over the given nodes/edges and returns the same
 * nodes with computed `position` values. Each node may carry its own `width`/
 * `height`; otherwise the defaults are used. Pure function — no React state.
 */
export function layoutGraph<T extends Node>(nodes: T[], edges: Edge[], options: LayoutOptions = {}): T[] {
  const { direction = "LR", defaultWidth = 280, defaultHeight = 150, nodeSep = 28, rankSep = 90 } = options;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep, marginx: 28, marginy: 28 });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: node.width ?? defaultWidth,
      height: node.height ?? defaultHeight,
    });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const laidOut = graph.node(node.id);
    const width = node.width ?? defaultWidth;
    const height = node.height ?? defaultHeight;
    return {
      ...node,
      // Dagre returns the node center; ReactFlow positions from the top-left.
      position: { x: laidOut.x - width / 2, y: laidOut.y - height / 2 },
    };
  });
}
