export interface SecurityReportNotification {
  id: number;
  projectName: string;
  domain: string | null;
  severityCritical: number;
  severityHigh: number;
  receivedAt: string;
}
