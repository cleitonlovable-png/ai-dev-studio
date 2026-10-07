export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  modified: string[];
  added: string[];
  removed: string[];
  untracked: string[];
  lastCommit: GitCommit | null;
  remoteUrl: string | null;
  clean: boolean;
}
