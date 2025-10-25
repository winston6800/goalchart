
export interface Node {
  id: string;
  title: string;
  importance: number;
  progressSelf: number; // Represents the node's own progress, not the roll-up
  color?: string;
  children: Node[];
}

export interface RenderNode {
  nodeId: string;
  depth: number;
  theta0: number;
  theta1: number;
  r0: number;
  r1: number;
  data: Node;
  displayProgress: number; // This is the calculated, rolled-up progress
  hasCollapsedChildren: boolean;
}
