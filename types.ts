
export interface Node {
  id: string;
  title: string;
  importance: number;
  progress: number;
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
}
