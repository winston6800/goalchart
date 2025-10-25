
import { Node, RenderNode } from './types';
import { PALETTE, CENTER_RADIUS, MAX_VISIBLE_DEPTH_OVERVIEW, MAX_VISIBLE_DEPTH_FOCUSED, MIN_BAND_THICKNESS_PX } from './constants';
import * as d3 from 'd3';

export const sampleData: Node = {
  id: 'root',
  title: 'Annual Company Goals',
  importance: 1,
  progressSelf: 0, // Parent progress is derived from children
  children: [
    {
      id: 'product',
      title: 'Product Development',
      importance: 4,
      progressSelf: 0.1, // Represents overhead work
      children: [
        { id: 'feat1', title: 'Feature A Launch', importance: 3, progressSelf: 0.8, children: [] },
        { id: 'feat2', title: 'Feature B R&D', importance: 2, progressSelf: 0.3, children: [] },
        { id: 'ux', title: 'UX Overhaul', importance: 1, progressSelf: 0, children: [
            { id: 'ux-research', title: 'User Research', importance: 1, progressSelf: 0.9, children: [] },
            { id: 'ux-design', title: 'Design System Update', importance: 1, progressSelf: 0.2, children: [] },
        ]},
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing & Sales',
      importance: 3,
      progressSelf: 0,
      children: [
        { id: 'campaign', title: 'Q3 Campaign', importance: 2, progressSelf: 0.1, children: [] },
        { id: 'seo', title: 'SEO Improvement', importance: 1, progressSelf: 0.5, children: [] },
        { id: 'sales-team', title: 'Expand Sales Team', importance: 2, progressSelf: 0.0, children: [] },
      ],
    },
    {
      id: 'hr',
      title: 'Human Resources',
      importance: 2,
      progressSelf: 0.2,
      children: [
        { id: 'hiring', title: 'Hire 10 Engineers', importance: 1, progressSelf: 0.9, children: [] },
        { id: 'culture', title: 'Improve Company Culture', importance: 1, progressSelf: 0.5, children: [] },
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

export function progressRollup(node: Node): number {
  // For a leaf node, its progress is its own self-progress.
  if (node.children.length === 0) {
    return node.progressSelf;
  }

  // For a parent node, calculate the importance-weighted average of its children's progress.
  const totalImportance = node.children.reduce((sum, child) => sum + child.importance, 0);
  if (totalImportance === 0) {
    // If children have no importance, fall back to the parent's self-progress.
    return node.progressSelf;
  }

  const childrenProgress = node.children.reduce((sum, child) => {
    // Recursively get the child's rolled-up progress.
    const childRolledUpProgress = progressRollup(child);
    return sum + (child.importance / totalImportance) * childRolledUpProgress;
  }, 0);

  // For now, we use alpha = 0, meaning parent progress is purely derived from children.
  // We can add an alpha blend later if needed.
  return childrenProgress;
}


export function generateRenderNodes(focusedNode: Node, width: number, height: number, isFocused: boolean): RenderNode[] {
    const renderNodes: RenderNode[] = [];
    const radius = Math.min(width, height) / 2 - 10;

    const hierarchy = d3.hierarchy(focusedNode);
    const maxPossibleDepth = hierarchy.height;
    const depthLimitFromSpec = isFocused ? MAX_VISIBLE_DEPTH_FOCUSED : MAX_VISIBLE_DEPTH_OVERVIEW;
    
    let allowedDepth = Math.min(maxPossibleDepth, depthLimitFromSpec);

    if (allowedDepth > 0) {
      const maxRingsBySize = Math.floor((radius - CENTER_RADIUS) / MIN_BAND_THICKNESS_PX);
      allowedDepth = Math.min(allowedDepth, maxRingsBySize);
    }
    
    const ringThickness = allowedDepth > 0 ? (radius - CENTER_RADIUS) / allowedDepth : 0;

    function processNode(node: Node, depth: number, theta0: number, theta1: number) {
        if (depth > allowedDepth) return;

        if (!node.color) {
            node.color = PALETTE[depth % PALETTE.length];
        }

        const hasCollapsedChildren = node.children.length > 0 && depth === allowedDepth;
        const displayProgress = progressRollup(node);

        renderNodes.push({
            nodeId: node.id,
            depth: depth,
            theta0: theta0,
            theta1: theta1,
            r0: depth === 0 ? 0 : CENTER_RADIUS + (depth - 1) * ringThickness,
            r1: depth === 0 ? CENTER_RADIUS : CENTER_RADIUS + depth * ringThickness,
            data: node,
            displayProgress,
            hasCollapsedChildren,
        });

        const totalChildrenImportance = node.children.reduce((sum, child) => sum + child.importance, 0);
        if (totalChildrenImportance > 0) {
            let childThetaStart = theta0;
            const sortedChildren = [...node.children].sort((a, b) => a.title.localeCompare(b.title));
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
    return { newRoot: root, newSelectedId: nodeId };
  }

  const path = findNodePath(root, nodeId);
  const parentId = path.length > 1 ? path[path.length - 2].id : null;

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

export function promoteChildrenInTree(root: Node, nodeId: string): { newRoot: Node, newSelectedId: string | null } {
  const path = findNodePath(root, nodeId);
  if (path.length < 2) { // Cannot promote children of root or if node not found
    return { newRoot: root, newSelectedId: nodeId };
  }
  
  const nodeToDelete = path[path.length - 1];
  const parent = path[path.length - 2];

  if (nodeToDelete.children.length === 0) {
      // Nothing to promote, just delete the node as a leaf
      return removeNodeFromTree(root, nodeId);
  }

  const totalChildrenImportance = nodeToDelete.children.reduce((sum, child) => sum + child.importance, 0);

  const promotedChildren = nodeToDelete.children.map(child => {
    const newImportance = totalChildrenImportance > 0 
      ? nodeToDelete.importance * (child.importance / totalChildrenImportance)
      : nodeToDelete.importance / nodeToDelete.children.length; // fallback if all children have 0 importance
    return {
      ...child,
      importance: newImportance,
    };
  });

  const nodeIndex = parent.children.findIndex(child => child.id === nodeId);
  
  const newParentChildren = [
    ...parent.children.slice(0, nodeIndex),
    ...promotedChildren,
    ...parent.children.slice(nodeIndex + 1),
  ];

  const updatedParent = {
    ...parent,
    children: newParentChildren,
  };

  const newRoot = updateNodeInTree(root, updatedParent);

  return { newRoot, newSelectedId: parent.id };
}
