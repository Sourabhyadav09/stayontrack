export interface EvidenceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  evidenceLabel: string;
}

export interface TaskVerification {
  verified: boolean;
  confidence: number;
  matchedEvidence: string;
  mismatchReason: string | null;
  followUpQuestion: string | null;
  verdictReason?: string;
  evidenceRegion?: EvidenceRegion | null;
  authenticityFlag?: "clean" | "blank" | "unrelated" | "looks_generated" | "looks_duplicated" | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO datetime
  priority: "high" | "medium" | "low";
  status: "pending" | "awaiting-proof" | "verified" | "rejected";
  proofImage?: string; // base64 representation of proof
  uploadMethod?: "live" | "upload";
  proofHash?: string;
  verification?: TaskVerification;
  createdAt: string;
  isUnproven?: boolean;
  escalation?: EscalationResponse;
}

export interface Stats {
  commitmentRate: number;
  streak: number;
  verifiedCount: number;
  rejectedCount: number;
  overdueCount: number;
  totalCount: number;
}

export interface TimeBlock {
  taskTitle: string;
  suggestedTimeBlock: string;
  reasoning: string;
}

export interface DailyPlan {
  schedule: TimeBlock[];
}

export interface RecoveryTask {
  taskTitle: string;
  actionItem: string;
  timing: string;
}

export interface EscalationResponse {
  recoveryPlan: RecoveryTask[];
  extensionDraft: string;
  buddyHeadsUp: string;
}


