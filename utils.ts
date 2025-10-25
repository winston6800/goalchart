// FIX: Import d3 library to resolve reference errors.
import * as d3 from 'd3';
import { Node, RenderNode } from './types';
import { PALETTE, CENTER_RADIUS } from './constants';

export const sampleData: Node = {
  id: 'root',
  title: 'Annual Company Goals',
  importance: 1,
  progress: 0.3,
  children: [
    {
      id: 'product',
      title: 'Product Development',
      importance: 4,
      progress: 0.5,
      children: [
        { id: 'feat1', title: 'Feature A Launch', importance: 3, progress: 0.8, children: [] },
        { id: 'feat2', title: 'Feature B R&D', importance: 2, progress: 0.3, children: [] },
        { id: 'ux', title: 'UX Overhaul', importance: 1, progress: 0.4, children: [
            { id: 'ux-research', title: 'User Research', importance: 1, progress: 0.9, children: [] },
            { id: 'ux-design', title: 'Design System Update', importance: 1, progress: 0.2, children: [] },
        ]},
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing & Sales',
      importance: 3,
      progress: 0.2,
      children: [
        { id: 'campaign', title: 'Q3 Campaign', importance: 2, progress: 0.1, children: [] },
        { id: 'seo', title: 'SEO Improvement', importance: 1, progress: 0.5, children: [] },
        { id: 'sales-team', title: 'Expand Sales Team', importance: 2, progress: 0.0, children: [] },
      ],
    },
    {
      id: 'hr',
      title: 'Human Resources',
      importance: 2,
      progress: 0.7,
      children: [
        { id: 'hiring', title: 'Hire 10 Engineers', importance: 1, progress: 0.9, children: [] },
        { id: 'culture', title: 'Improve Company Culture', importance: 1, progress: 0.5, children: [] },
      ],
    },
  ],
};

export function findNodeById(tree: Node, id: string): Node | null {
  if (tree.id === id) {
    return tree;
  }
  for (const child of tree.children) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

export function findNodePath(tree: Node, id: string): Node[] {
    const path: Node[] = [];
    
    function find(current: Node): boolean {
        path.push(current);
        if (current.id === id) {
            return true;
        }
        for (const child of current.children) {
            if (find(child)) {
                return true;
            }
        }
        path.pop();
        return false;
    }

    find(tree);
    return path;
}


export function updateNodeInTree(root: Node, updatedNode: Node): Node {
  const newRoot = { ...root };

  function recursiveUpdate(node: Node): Node {
    if (node.id === updatedNode.id) {
      return { ...node, ...updatedNode };
    }
    return {
      ...node,
      children: node.children.map(child => recursiveUpdate(child)),
    };
  }
  return recursiveUpdate(newRoot);
}

export function generateRenderNodes(focusedNode: Node, width: number, height: number): RenderNode[] {
    const hierarchy = d3.hierarchy(focusedNode)
        .sum(d => d.children.length > 0 ? 0 : d.importance) // Size leaves by importance
        .sort((a, b) => b.value! - a.value!);

    const maxDepth = hierarchy.height;
    const radius = Math.min(width, height) / 2 - 10;
    const ringThickness = maxDepth > 0 ? (radius - CENTER_RADIUS) / maxDepth : radius - CENTER_RADIUS;


    const partition = d3.partition()
        .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);

    const renderNodes: RenderNode[] = [];
    
    root.descendants().forEach(d => {
        if(d.depth > maxDepth) return;
        // Assign colors if not present
        if (!d.data.color) {
            d.data.color = PALETTE[d.depth % PALETTE.length];
        }

        renderNodes.push({
            nodeId: d.data.id,
            depth: d.depth,
            theta0: d.x0,
            theta1: d.x1,
            r0: d.y0 + CENTER_RADIUS,
            r1: d.y1 + CENTER_RADIUS,
            data: d.data,
        });
    });
    // Adjust radius for partition layout
    const descendants = root.descendants();
    const maxPartitionRadius = d3.max(descendants, d => d.y1) || radius;
    
    descendants.forEach(d => {
        const r0 = (d.y0 / maxPartitionRadius) * (radius - CENTER_RADIUS) + CENTER_RADIUS;
        const r1 = (d.y1 / maxPartitionRadius) * (radius - CENTER_RADIUS) + CENTER_RADIUS;
    })


    return renderNodes;
}

export const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function addNodeToTree(root: Node, parentId: string, newNode: Node): Node {
  const parent = findNodeById(root, parentId);
  if (!parent) return root;

  const updatedParent = {
    ...parent,
    children: [...parent.children, newNode],
  };

  return updateNodeInTree(root, updatedParent);
}

export function removeNodeFromTree(root: Node, nodeId: string): { newRoot: Node, newSelectedId: string | null } {
  const path = findNodePath(root, nodeId);
  if (path.length < 2) return { newRoot: root, newSelectedId: nodeId }; // Cannot remove root

  const parent = path[path.length - 2];
  
  const updatedParent = {
    ...parent,
    children: parent.children.filter(c => c.id !== nodeId),
  };

  const newRoot = updateNodeInTree(root, updatedParent);
  return { newRoot, newSelectedId: parent.id };
}