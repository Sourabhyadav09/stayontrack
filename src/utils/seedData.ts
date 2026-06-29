import { Task } from "../types";

export function getSeedTasks(): Task[] {
  const now = new Date();
  
  // 1. A verified task that sets up our starter streak (1 streak)
  const verifiedTask: Task = {
    id: "seed-task-1",
    title: "Design StayOnTrack layout",
    description: "Incorporate high-contrast emerald and indigo palettes, rounded container units, and card-based statistics dashboard layouts.",
    deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    priority: "medium",
    status: "verified",
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    verification: {
      verified: true,
      confidence: 0.96,
      matchedEvidence: "The submission displays a clear mockup of a multi-section screen utilizing custom emerald and deep indigo themes, rounded structural boundaries, and clear charts matching standard technical UX requirements.",
      mismatchReason: null,
      followUpQuestion: null
    },
    proofImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'><rect width='400' height='200' fill='%231e1b4b'/><circle cx='80' cy='100' r='40' fill='%2310b981' opacity='0.3'/><circle cx='320' cy='100' r='60' fill='%234f46e5' opacity='0.4'/><text x='200' y='105' fill='white' font-family='sans-serif' font-size='20' text-anchor='middle'>STAYONTRACK MOCKUP</text></svg>"
  };

  // 2. High priority task due soon (e.g., in 4 hours)
  const dueSoonTask: Task = {
    id: "seed-task-2",
    title: "Submit DBMS Assignment",
    description: "Review third normal form database schemas, optimize transaction log indexing statements, and upload the final compiled PDF report.",
    deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // in 4 hours
    priority: "high",
    status: "pending",
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
  };

  // 3. Medium priority task already overdue (e.g., due yesterday)
  const overdueTask: Task = {
    id: "seed-task-3",
    title: "Review Clean Code chapters",
    description: "Read Chapters 2, 3, and 4 covering meaningful names, elegant functions, and writing descriptive semantic comments.",
    deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    priority: "medium",
    status: "pending",
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return [verifiedTask, dueSoonTask, overdueTask];
}
