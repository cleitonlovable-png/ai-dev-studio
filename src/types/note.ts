export interface Note {
  id: number;
  projectId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  projectId: number;
  title: string;
  content: string;
}
