export interface Diagram {
  id: number;
  projectId: number;
  title: string;
  mermaidSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagramInput {
  projectId: number;
  title: string;
  mermaidSource: string;
}
