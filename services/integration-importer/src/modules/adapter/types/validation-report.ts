export interface ValidationIssue {
  file: string;
  row?: number;
  column?: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
