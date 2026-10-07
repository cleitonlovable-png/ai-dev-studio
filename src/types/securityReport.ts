export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "open" | "reviewing" | "false_positive" | "resolved" | "accepted_risk";

export interface SecurityFinding {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  category: string | null;
  severity: FindingSeverity;
  remediation: string | null;
  endpointOrFile: string | null;
  pluginName: string | null;
  status: FindingStatus;
  resolvedAt: string | null;
  externalReference: string | null;
}

export interface SecurityReport {
  id: number;
  scanId: string;
  projectName: string;
  domain: string | null;
  scanType: string;
  status: string;
  severityCritical: number;
  severityHigh: number;
  severityMedium: number;
  severityLow: number;
  severityInfo: number;
  receivedAt: string;
  projectId: number | null;
  findings: SecurityFinding[];
}
