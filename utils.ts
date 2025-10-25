
import { Node, RenderNode } from './types';
import { PALETTE, CENTER_RADIUS } from './constants';
import * as d3 from 'd3';

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
  function recursiveUpdate(node: Node): Node {
    if (node.id === updatedNode.id) {
      return updatedNode;
    }
    return {
      ...node,
      children: node.children.map(child => recursiveUpdate(child)),
    };
  }
  return recursiveUpdate(root);
}

export function generateRenderNodes(focusedNode: Node, width: number, height: number): RenderNode[] {
    const renderNodes: RenderNode[] = [];
    const radius = Math.min(width, height) / 2 - 10;

    // We need to know the max depth to calculate ring thickness
    const hierarchyForDepth = d3.hierarchy(focusedNode);
    const maxDepth = hierarchyForDepth.height;
    const ringThickness = maxDepth > 0 ? (radius - CENTER_RADIUS) / maxDepth : radius - CENTER_RADIUS;

    function processNode(node: Node, depth: number, theta0: number, theta1: number) {
        // Assign color if not present
        if (!node.color) {
            node.color = PALETTE[depth % PALETTE.length];
        }

        renderNodes.push({
            nodeId: node.id,
            depth: depth,
            theta0: theta0,
            theta1: theta1,
            r0: depth * ringThickness + CENTER_RADIUS,
            r1: (depth + 1) * ringThickness + CENTER_RADIUS,
            data: node,
        });

        const totalChildrenImportance = node.children.reduce((sum, child) => sum + child.importance, 0);
        if (totalChildrenImportance > 0) {
            let childThetaStart = theta0;
            // Sort children to have a stable layout
            const sortedChildren = [...node.children].sort((a,b) => a.title.localeCompare(b.title));
            for (const child of sortedChildren) {
                const childAngleSpan = (theta1 - theta0) * (child.importance / totalChildrenImportance);
                const childThetaEnd = childThetaStart + childAngleSpan;
                processNode(child, depth + 1, childThetaStart, childThetaEnd);
                childThetaStart = childThetaEnd;
            }
        }
    }

    processNode(focusedNode, 0, 0, 2 * Math.PI);

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
  if (root.id === nodeId) {
    // As per existing logic, can't delete root
    return { newRoot: root, newSelectedId: nodeId };
  }

  const path = findNodePath(root, nodeId);
  const parentId = path.length > 1 ? path[path.length - 2].id : null;

  // A simpler recursive remover that rebuilds the tree immutably
  function recursiveRemove(node: Node): Node {
      return {
          ...node,
          children: node.children
              .filter(child => child.id !== nodeId)
              .map(child => recursiveRemove(child))
      };
  }
  
  const newRoot = recursiveRemove(root);

  return { newRoot, newSelectedId: parentId };
}
