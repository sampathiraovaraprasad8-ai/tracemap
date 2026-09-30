import dagre from 'dagre';

/**
 * Deterministic Graph Layout Generator using Dagre
 * Ensures nodes are positioned cleanly in ranks without overlap.
 * 
 * @param {Array} nodes - React Flow nodes array
 * @param {Array} edges - React Flow edges array
 * @param {string} direction - Layout direction ('LR' = Left-to-Right, 'TB' = Top-to-Bottom)
 * @returns {Object} - Object containing { nodes, edges } with layouted positions
 */
export function getLayoutedElements(nodes = [], edges = [], direction = 'LR') {
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 240;
  const nodeHeight = 110;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 140,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const x = nodeWithPosition
      ? nodeWithPosition.x - nodeWidth / 2
      : Math.random() * 400;
    const y = nodeWithPosition
      ? nodeWithPosition.y - nodeHeight / 2
      : Math.random() * 400;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
}
