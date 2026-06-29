/**
 * Utility functions for date manipulation and formatting
 */

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unknown Deadline";
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown Deadline";
  }
}

export function getDeadlineStatus(isoString: string): {
  isOverdue: boolean;
  isDueSoon: boolean;
  timeLabel: string;
} {
  try {
    const now = new Date();
    const deadline = new Date(isoString);
    
    if (isNaN(deadline.getTime())) {
      return { isOverdue: false, isDueSoon: false, timeLabel: "" };
    }
    
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const isOverdue = diffMs < 0;
    // Due soon means not overdue, and within 24 hours
    const isDueSoon = !isOverdue && diffHours <= 24;
    
    let timeLabel = "";
    const absHours = Math.abs(diffHours);
    
    if (isOverdue) {
      if (absHours < 1) {
        const mins = Math.max(1, Math.round(absHours * 60));
        timeLabel = `${mins}m overdue`;
      } else if (absHours < 24) {
        timeLabel = `${Math.round(absHours)}h overdue`;
      } else {
        timeLabel = `${Math.round(absHours / 24)}d overdue`;
      }
    } else {
      if (diffHours < 1) {
        const mins = Math.max(1, Math.round(diffHours * 60));
        timeLabel = `${mins}m left`;
      } else if (diffHours < 24) {
        timeLabel = `${Math.round(diffHours)}h left`;
      } else {
        timeLabel = `${Math.round(diffHours / 24)}d left`;
      }
    }
    
    return { isOverdue, isDueSoon, timeLabel };
  } catch {
    return { isOverdue: false, isDueSoon: false, timeLabel: "Invalid date" };
  }
}
