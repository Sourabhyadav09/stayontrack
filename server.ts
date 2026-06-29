import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up large payload limits for handling image submissions (base64 screen captures)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Lazy initializer for Google GenAI client to prevent startup failure if API key is not set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not defined or is placeholder. Please configure your actual Gemini API Key in the Settings > Secrets panel of AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Helper to perform Gemini calls with automatic fallback to 'gemini-flash-latest' if 'gemini-2.5-flash' hits 429/quota exhaustion.
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  try {
    return await ai.models.generateContent({
      ...params,
      model: "gemini-2.5-flash"
    });
  } catch (error: any) {
    const errMsg = String(error.message || error);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("gemini-2.5-flash hit resource exhaustion (429). Attempting automatic fallback to gemini-flash-latest...", error);
      return await ai.models.generateContent({
        ...params,
        model: "gemini-flash-latest"
      });
    }
    throw error;
  }
}

// Support parsing dataURI or base64 string
function parseBase64Image(dataURI: string) {
  const matches = dataURI.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  return {
    mimeType: "image/png",
    data: dataURI
  };
}

// API endpoint to parse task from natural language
app.post("/api/tasks/parse", async (req, res) => {
  try {
    const { text, currentDateTime } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing required parameter: text" });
    }

    const ai = getGeminiClient();
    const prompt = `Parse the following task into standard JSON: "${text}".
The current references local date/time is: "${currentDateTime || new Date().toISOString()}".
Extract the task's title, description (summarized elegantly), priority, and calculate the exact absolute ISO-8601 deadline time, resolving any relative terms (e.g. "tomorrow", "this friday by 5pm", "in an hour", "midnight") relative to the provided current reference date/time.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A concise, actionable title of the task" },
            description: { type: Type.STRING, description: "A clean description of the deadline requirements" },
            deadline: { type: Type.STRING, description: "Absolute ISO-8601 datetime string representing the resolved task deadline" },
            priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "The priority level of the task" }
          },
          required: ["title", "description", "deadline", "priority"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response received from Gemini parsed-task generation.");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Error parsing task:", error);
    return res.status(500).json({ error: error.message || "Failed to parse task input" });
  }
});

// API endpoint to verify task proof image
app.post("/api/tasks/verify", async (req, res) => {
  try {
    const { task, imageData } = req.body;
    if (!task || !imageData) {
      return res.status(400).json({ error: "Missing required parameters: task or imageData" });
    }

    const parsedImage = parseBase64Image(imageData);
    const ai = getGeminiClient();

    const systemInstruction = `You are an accountability verifier. You are given a task (title, description, deadline) and an image the user submitted as proof they completed it. Judge CONTEXTUALLY whether the image genuinely proves THIS specific task was done. Accept reasonable real evidence. Reject blank/unrelated images, screenshots of a DIFFERENT task or course, or anything that doesn't actually show completion. Be fair, not pedantic — a plausible, on-topic, correct proof should pass.

Additionally, analyze the authenticity of the proof to detect cheating. Specifically check for and flag:
- A completely blank or empty image -> return "blank"
- An image entirely unrelated to this specific task -> return "unrelated"
- A screenshot-of-a-screenshot (e.g., showing outer browser frames, phone frames, UI margins, nested window/screen crops that hint the user is presenting someone else's screenshot) -> return "unrelated" or "looks_duplicated" depending on visual context.
- An image that looks generated (AI-generated artifacts, synthetic images, stock photos, mockups, or internet memes) -> return "looks_generated"
- An image that looks duplicated (reused screenshot or matching stock layouts) -> return "looks_duplicated"
- Standard, clean, authentic screenshots or live camera pictures taken directly to verify this task -> return "clean"

You must output this analysis as an authenticityFlag. If the authenticityFlag is NOT "clean", you must explain it in the verdictReason and set verified to false.

Always provide a confident courtroom-style judgment statement in first-person, plain English for verdictReason (e.g. "I can see a sent-confirmation screen for the exact tax form you committed to — Verified." or "This is a blank wall, but your task was to submit the report — Rejected.").

Additionally, identify the bounding box of the visual region you keyed on for evidence (the screen, the document, the confirmation, a physical item, etc.) as evidenceRegion. Give fractional coordinates 0.0 to 1.0 (where (0,0) is top-left, and (1,1) is bottom-right). Provide a very short label for this region. If there is no specific visual region of evidence, set x, y, width, height to 0.0, and evidenceLabel to "". Always respond ONLY in the required JSON schema.`;

    const prompt = `Task Details:
Title: ${task.title}
Description: ${task.description}
Deadline: ${task.deadline}`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.data
          }
        },
        { text: prompt }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN, description: "True if the image genuinely proves this specific task was performed, false otherwise." },
            confidence: { type: Type.NUMBER, description: "Your confidence rate in this judgment between 0.0 and 1.0." },
            matchedEvidence: { type: Type.STRING, description: "What visual elements in the image support this verification outcome." },
            mismatchReason: { type: Type.STRING, description: "Explanation of why the task failed compilation, was rejected, or why there is a mismatch. Return null if verified is true." },
            followUpQuestion: { type: Type.STRING, description: "A follow-up question or feedback if verification failed. Return null if verified is true." },
            verdictReason: { type: Type.STRING, description: "A persistent judgment statement in confident first-person, plain English, explaining your final decision. Format e.g., 'I can see a sent-confirmation screen for the exact tax form you committed to — Verified.' or 'This is a blank wall, but your task was to submit the report — Rejected.'" },
            evidenceRegion: {
              type: Type.OBJECT,
              description: "Bounding-box region of the image where you detected the key evidence. If no specific region of evidence is identified, set x, y, width, and height to 0.0 and evidenceLabel to ''.",
              properties: {
                x: { type: Type.NUMBER, description: "Horizontal starting coordinate of bounding box as fraction (0.0 to 1.0)." },
                y: { type: Type.NUMBER, description: "Vertical starting coordinate of bounding box as fraction (0.0 to 1.0)." },
                width: { type: Type.NUMBER, description: "Width of bounding box as fraction (0.0 to 1.0)." },
                height: { type: Type.NUMBER, description: "Height of bounding box as fraction (0.0 to 1.0)." },
                evidenceLabel: { type: Type.STRING, description: "A very short, clear label for the key element/evidence, e.g., 'matched: sent confirmation'." }
              },
              required: ["x", "y", "width", "height", "evidenceLabel"]
            },
            authenticityFlag: {
              type: Type.STRING,
              description: "The authenticity assessment. Must be one of: 'clean', 'blank', 'unrelated', 'looks_generated', 'looks_duplicated'."
            }
          },
          required: ["verified", "confidence", "matchedEvidence", "mismatchReason", "followUpQuestion", "verdictReason", "evidenceRegion", "authenticityFlag"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No verification response received from Gemini.");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Error verifying task:", error);
    return res.status(500).json({ error: error.message || "Failed to verify submission" });
  }
});

// API endpoint to generate time-blocked daily plan using AI
app.post("/api/tasks/plan", async (req, res) => {
  try {
    const { tasks, currentDateTime } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Missing or invalid tasks array parameter" });
    }

    if (tasks.length === 0) {
      return res.json({ schedule: [] });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an expert personal productivity coach and time-management expert. You take a list of a user's pending and overdue tasks and organize them into a realistic, sequential, time-blocked schedule for today.
Key principles to reason about:
1. Urgency: Hard deadlines or near deadlines must be prioritized first.
2. Priority: High priority items should be placed in peak focus hours or scheduled early.
3. Realistic effort: Leave transition space. Do not schedule back-to-back intense tasks without breathing room.
4. Concreteness: Provide clear clock time suggestions (e.g., "10:00 AM - 11:30 AM") for each block, and explain the coaching reasoning behind each block choice.
Return the output strictly matching the provided JSON schema.`;

    const tasksListStr = tasks.map((t, index) => `${index + 1}. Title: "${t.title}" | Deadline: "${t.deadline}" | Priority: "${t.priority}" | Description: "${t.description || 'N/A'}"`).join("\n");
    
    const prompt = `Here is the list of tasks to organize into today's time-blocked schedule:
${tasksListStr}

The current date and time reference is: "${currentDateTime || new Date().toISOString()}".
Please create a realistic, time-blocked daily plan for today containing these tasks.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              description: "The time-blocked schedule for today, sorted in chronological order of suggested time blocks",
              items: {
                type: Type.OBJECT,
                properties: {
                  taskTitle: { type: Type.STRING, description: "The exact or summarized title of the task" },
                  suggestedTimeBlock: { type: Type.STRING, description: "A realistic time block for today, e.g. '09:00 AM - 10:30 AM'" },
                  reasoning: { type: Type.STRING, description: "Empathetic, clear reasoning for scheduling it at this time, considering priority, deadlines, and mental fatigue" }
                },
                required: ["taskTitle", "suggestedTimeBlock", "reasoning"]
              }
            }
          },
          required: ["schedule"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response received from Gemini daily plan generator.");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Error planning day:", error);
    return res.status(500).json({ error: error.message || "Failed to generate daily plan" });
  }
});

// API endpoint to autonomously generate an escalation recovery plan, extension draft, and buddy heads-up
app.post("/api/tasks/escalate", async (req, res) => {
  try {
    const { overdueTask, remainingTasks, currentDateTime } = req.body;
    if (!overdueTask) {
      return res.status(400).json({ error: "Missing required parameter: overdueTask" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are StayOnTrack's Autonomous Escalation Agent. When a user falls behind on a crucial task, you step in with constructive, high-integrity recovery support.
Generate three things in structured JSON format:
1. recoveryPlan: A re-prioritized step-by-step list of actions/tasks for the user to recover control. You must address how to fit the remaining tasks alongside the recovery of this overdue task.
2. extensionDraft: A polite, professional, and responsible email or chat message draft requesting a deadline extension from a supervisor, client, or team leader. It should explain the delay briefly, state the new realistic proposed time, and outline the immediate action being taken.
3. buddyHeadsUp: A short, direct, and transparent heads-up note to send to an accountability buddy or peer, acknowledging the slip and committing to the next recovery step.

Return the response matching the specified JSON schema.`;

    const remainingTasksStr = (remainingTasks || [])
      .map((t: any, index: number) => `${index + 1}. Title: "${t.title}" | Priority: "${t.priority}" | Deadline: "${t.deadline}"`)
      .join("\n");

    const prompt = `The user has missed a deadline!
OVERDUE TASK DETAILS:
- Title: "${overdueTask.title}"
- Description: "${overdueTask.description || 'No description provided'}"
- Original Deadline: "${overdueTask.deadline}"
- Priority: "${overdueTask.priority}"

OTHER CURRENT TASKS:
${remainingTasksStr || 'None'}

Current Date/Time reference: "${currentDateTime || new Date().toISOString()}"

Please produce:
1. A structured recovery plan for the remaining items.
2. A professional, polite extension request draft.
3. A short, honest accountability buddy text.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recoveryPlan: {
              type: Type.ARRAY,
              description: "A re-prioritized task-by-task recovery schedule",
              items: {
                type: Type.OBJECT,
                properties: {
                  taskTitle: { type: Type.STRING, description: "Title of the task or recovering step" },
                  actionItem: { type: Type.STRING, description: "Specific immediate action to recover or make progress" },
                  timing: { type: Type.STRING, description: "Recommended timing, e.g. 'Next 60 minutes', 'First thing tomorrow'" }
                },
                required: ["taskTitle", "actionItem", "timing"]
              }
            },
            extensionDraft: { type: Type.STRING, description: "Polite, professional email/slack request for deadline extension" },
            buddyHeadsUp: { type: Type.STRING, description: "Short, direct, honest heads-up message for a peer or accountability buddy" }
          },
          required: ["recoveryPlan", "extensionDraft", "buddyHeadsUp"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response received from the Gemini Escalation agent.");
    }

    const result = JSON.parse(response.text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Error during escalation:", error);
    return res.status(500).json({ error: error.message || "Failed to execute escalation action" });
  }
});

// API endpoint to check if the Gemini API Key is configured and ready
app.get("/api/config-status", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = !!apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";
  return res.json({ configured: isConfigured });
});

// App environment routing
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StayOnTrack server is running on http://localhost:${PORT}`);
  });
}

initServer();
