import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Flame, 
  Target, 
  TrendingUp, 
  Plus, 
  UploadCloud, 
  Clock, 
  Sparkles, 
  Trash2, 
  Camera, 
  Check, 
  RotateCcw, 
  AlertTriangle,
  ChevronRight,
  Info,
  Copy,
  CheckCheck,
  ShieldAlert,
  Users,
  Send,
  Mic,
  MicOff
} from "lucide-react";
import { Task, Stats, TaskVerification, DailyPlan, EscalationResponse } from "./types";
import { formatDateTime, getDeadlineStatus } from "./utils/date";
import { getSeedTasks } from "./utils/seedData";
import { motion } from "motion/react";

// Exponential backoff fetch helper for resilient API integration
const fetchWithExponentialBackoff = async (
  url: string,
  options: RequestInit,
  onRetry: (attempt: number, delayMs: number) => void
): Promise<Response> => {
  const delays = [1000, 2000, 4000];
  let lastError: any = null;

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, options);
      
      if (res.ok) {
        return res;
      }
      
      let isTransient = res.status === 503 || res.status === 429;
      let errorText = "";
      try {
        const clone = res.clone();
        const json = await clone.json();
        errorText = json?.error || "";
        if (json?.isTransient) {
          isTransient = true;
        }
      } catch (e) {
        // Fallback if parsing JSON fails
      }

      const errMsgLower = (errorText || "").toLowerCase();
      const isTransientReason = 
        errMsgLower.includes("unavailable") || 
        errMsgLower.includes("resource_exhausted") || 
        errMsgLower.includes("resource has been exhausted") || 
        errMsgLower.includes("overloaded") || 
        errMsgLower.includes("high demand") || 
        errMsgLower.includes("busy");

      if (isTransient || isTransientReason) {
        if (attempt < 3) {
          const delay = delays[attempt];
          onRetry(attempt + 1, delay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      throw new Error(errorText || `Request failed with status ${res.status}`);

    } catch (err: any) {
      lastError = err;
      
      const errMsgLower = (err.message || String(err)).toLowerCase();
      const isTransientException = 
        errMsgLower.includes("unavailable") || 
        errMsgLower.includes("503") || 
        errMsgLower.includes("429") || 
        errMsgLower.includes("resource_exhausted") || 
        errMsgLower.includes("resource has been exhausted") || 
        errMsgLower.includes("overloaded") || 
        errMsgLower.includes("high demand") || 
        errMsgLower.includes("busy");

      if (isTransientException && attempt < 3) {
        const delay = delays[attempt];
        onRetry(attempt + 1, delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    }
  }

  throw lastError || new Error("Max retries exceeded");
};

const getConfidenceAngle = (confidence: number) => {
  if (confidence >= 0.85) return 150; // High
  if (confidence >= 0.5) return 90;   // Medium
  return 30;                          // Low
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.85) return "HIGH";
  if (confidence >= 0.5) return "MEDIUM";
  return "LOW";
};

function ConfettiBurst() {
  const pieces = Array.from({ length: 50 }).map((_, i) => {
    const left = Math.random() * 100;
    const size = Math.random() * 8 + 4;
    const delay = Math.random() * 1.5;
    const duration = Math.random() * 2 + 1.5;
    const colors = ["#10b981", "#34d399", "#6ee7b7", "#ffffff", "#f59e0b", "#fbbf24"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { id: i, left, size, delay, duration, color };
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `-20px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confettiFall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Computes a simple perceptual average-hash (aHash) of a base64 image.
 * Resizes the image to 8x8 greyscale, calculates average brightness,
 * and outputs a 64-bit hex hash.
 */
const computePerceptualHash = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 8;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(simpleStringHash(base64Str));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        
        let total = 0;
        const greys = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const grey = 0.299 * r + 0.587 * g + 0.114 * b;
          greys.push(grey);
          total += grey;
        }
        const average = total / greys.length;
        
        let binaryStr = "";
        for (const grey of greys) {
          binaryStr += grey >= average ? "1" : "0";
        }
        
        let hexStr = "";
        for (let i = 0; i < binaryStr.length; i += 4) {
          const chunk = binaryStr.substring(i, i + 4);
          hexStr += parseInt(chunk, 2).toString(16);
        }
        resolve(hexStr);
      } catch (e) {
        resolve(simpleStringHash(base64Str));
      }
    };
    img.onerror = () => {
      resolve(simpleStringHash(base64Str));
    };
    img.src = base64Str;
  });
};

const simpleStringHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export default function App() {
  // Main states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Proof Modal state
  const [activeProofTask, setActiveProofTask] = useState<Task | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<TaskVerification | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Camera & Anti-Cheat tracking states
  const [uploadMethod, setUploadMethod] = useState<"live" | "upload" | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cinematic Ceremony states
  const [ceremonyStep, setCeremonyStep] = useState<number>(0);
  const [isAnimatingGauge, setIsAnimatingGauge] = useState(false);
  const [stampSlammed, setStampSlammed] = useState(false);

  // Daily Plan States
  const [isPlanning, setIsPlanning] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lastTransientPlan, setLastTransientPlan] = useState(false);
  const [showPlanPanel, setShowPlanPanel] = useState(false);

  // Escalation States
  const [escalatingTaskId, setEscalatingTaskId] = useState<string | null>(null);
  const [escalationResults, setEscalationResults] = useState<Record<string, EscalationResponse>>({});
  const [escalationErrors, setEscalationErrors] = useState<Record<string, string | null>>({});
  const [escalationLastTransient, setEscalationLastTransient] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Evening Reckoning States
  const [isReckoningActive, setIsReckoningActive] = useState(false);
  const [reckoningStep, setReckoningStep] = useState<"intro" | "counting" | "resolving" | "escalating" | "complete">("intro");
  const [reckoningProven, setReckoningProven] = useState<Task[]>([]);
  const [reckoningUnproven, setReckoningUnproven] = useState<Task[]>([]);
  const [escalatingIndex, setEscalatingIndex] = useState<number>(-1);
  const [reckoningEscalationLines, setReckoningEscalationLines] = useState<{
    taskId: string;
    taskTitle: string;
    status: "pending" | "done" | "error";
    recovery?: EscalationResponse;
  }[]>([]);
  const [reckoningOutcome, setReckoningOutcome] = useState<"pass" | "fail" | null>(null);
  const [currentProvenCount, setCurrentProvenCount] = useState(0);
  const [currentUnprovenCount, setCurrentUnprovenCount] = useState(0);

  // Retry tracking states
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [lastTransientParse, setLastTransientParse] = useState(false);
  const [lastTransientVerification, setLastTransientVerification] = useState(false);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini API Key availability state
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);

  // Voice Input (SpeechRecognition) States
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Check Gemini API Key configuration status
  useEffect(() => {
    fetch("/api/config-status")
      .then((res) => res.json())
      .then((data) => setIsKeyConfigured(data.configured))
      .catch((err) => console.error("Error checking key configuration status:", err));
  }, []);

  // Check speech recognition support on mount & cleanup on unmount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      alert("Web Speech API (Speech Recognition) is not supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            alert("Microphone access denied. Please allow microphone permission in your browser.");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript) {
            setNaturalLanguageInput(prev => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
            });
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
        setIsListening(false);
      }
    }
  };

  // Suggested quick prompts for demo purposes
  const suggestedPrompts = [
    { label: "Pay electric bill tomorrow by 6pm", text: "Pay electric bill tomorrow by 6pm" },
    { label: "Submit DBMS Assignment", text: "Submit DBMS assignment in 3 hours" },
    { label: "Go to the Gym this Friday 8am", text: "Go to the gym and log workout this Friday at 8am" },
  ];

  // Load initial tasks from local storage or install seeds
  useEffect(() => {
    const saved = localStorage.getItem("stay_on_track_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing stored tasks, falling back to seed", e);
        const seeds = getSeedTasks();
        setTasks(seeds);
        localStorage.setItem("stay_on_track_tasks", JSON.stringify(seeds));
      }
    } else {
      const seeds = getSeedTasks();
      setTasks(seeds);
      localStorage.setItem("stay_on_track_tasks", JSON.stringify(seeds));
    }
  }, []);

  // Save tasks to local storage whenever they change
  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem("stay_on_track_tasks", JSON.stringify(updatedTasks));
  };

  // Helper to re-seed or clear statistics
  const handleResetToSeeds = () => {
    if (window.confirm("Are you sure you want to reset all tasks back to the default seed demo? This will overwrite your current progress.")) {
      const seeds = getSeedTasks();
      saveTasks(seeds);
      // Close modal just in case
      setActiveProofTask(null);
      setPreviewImage(null);
      setVerificationResult(null);
    }
  };

  // 1) Statistics Calculation
  const calculateStats = (): Stats => {
    const verified = tasks.filter(t => t.status === "verified").length;
    const rejected = tasks.filter(t => t.status === "rejected").length;
    
    // Check which pending tasks are overdue based on current time
    const overdueCount = tasks.filter(t => {
      if (t.status !== "pending" && t.status !== "awaiting-proof") return false;
      const { isOverdue } = getDeadlineStatus(t.deadline);
      return isOverdue;
    }).length;

    const denominator = verified + rejected + overdueCount;
    const commitmentRate = denominator > 0 ? Math.round((verified / denominator) * 100) : 100;

    // Streak calculation:
    // Sort all verified/rejected tasks chronologically by deadline (or creation/verification date)
    // and count consecutive "verified" tasks starting from the most recent completed task backwards.
    const completedTasks = tasks
      .filter(t => t.status === "verified" || t.status === "rejected")
      .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

    let streak = 0;
    for (const t of completedTasks) {
      if (t.status === "verified") {
        streak += 1;
      } else if (t.status === "rejected") {
        break; // Streak broken
      }
    }

    return {
      commitmentRate,
      streak,
      verifiedCount: verified,
      rejectedCount: rejected,
      overdueCount,
      totalCount: tasks.length
    };
  };

  const stats = calculateStats();

  const getVerifiedDaysGrid = () => {
    const grid = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    for (let i = 27; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toDateString();
      const hasVerifiedTask = tasks.some(t => {
        if (t.status !== "verified") return false;
        return new Date(t.deadline).toDateString() === dateStr;
      });
      grid.push({
        date: checkDate,
        verified: hasVerifiedTask,
        label: checkDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      });
    }
    return grid;
  };

  const gridDays = getVerifiedDaysGrid();

  const recentSubmissions = tasks
    .filter(t => t.status === "verified" || t.status === "rejected")
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())
    .slice(0, 5);

  // 2) AI Natural Language Parsing Request
  const handleAddTaskSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!naturalLanguageInput.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setRetryMessage(null);
    setIsRetrying(false);
    setLastTransientParse(false);

    try {
      const response = await fetchWithExponentialBackoff(
        "/api/tasks/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: naturalLanguageInput,
            currentDateTime: new Date().toISOString()
          })
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryMessage("Gemini is busy right now — retrying...");
        }
      );

      const parsedTask = await response.json();
      
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: parsedTask.title || "Untitled Task",
        description: parsedTask.description || "No description provided.",
        deadline: parsedTask.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: parsedTask.priority || "medium",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      saveTasks([newTask, ...tasks]);
      setNaturalLanguageInput("");
      setParseError(null);
    } catch (err: any) {
      console.error(err);
      
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();
      const isTransient = errMsgLower.includes("unavailable") || 
                          errMsgLower.includes("503") || 
                          errMsgLower.includes("429") || 
                          errMsgLower.includes("resource_exhausted") || 
                          errMsgLower.includes("resource has been exhausted") || 
                          errMsgLower.includes("overloaded") || 
                          errMsgLower.includes("high demand") || 
                          errMsgLower.includes("busy");

      if (isTransient) {
        setLastTransientParse(true);
        setParseError("The AI is experiencing high demand. Please try again in a moment.");
      } else {
        setLastTransientParse(false);
        setParseError(errMsg.includes("API_KEY") ? "Gemini API key is missing or invalid. Please set your key in Settings > Secrets." : "Task parser could not process this input. Please try rephrasing.");
      }
    } finally {
      setIsParsing(false);
      setRetryMessage(null);
      setIsRetrying(false);
    }
  };

  // 3) Manage Overdue Status Display
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "low": return "bg-brand-well text-brand-secondary border border-brand-primary/10";
    }
  };

  const getStatusBadge = (task: Task) => {
    const { isOverdue } = getDeadlineStatus(task.deadline);

    if (task.status === "verified") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30 font-mono">
          <Check className="w-3.5 h-3.5" /> Verified
        </span>
      );
    }
    if (task.status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }
    if (task.status === "awaiting-proof") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20 font-mono">
          <UploadCloud className="w-3.5 h-3.5" /> Checking ...
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-mono animate-pulse border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5" /> Overdue
        </span>
      );
    }
    
    // Default Pending
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-well text-brand-secondary border border-brand-primary/10 font-mono">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    if (window.confirm("Delete this task? This action is permanent.")) {
      const filtered = tasks.filter(t => t.id !== id);
      saveTasks(filtered);
      if (activeProofTask?.id === id) {
        closeProofModal();
      }
    }
  };

  // Camera & Anti-Cheat functions
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.log("Video play error:", err));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please allow camera permissions or switch to file upload.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && streamRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          
          setPreviewImage(dataUrl);
          setUploadMethod("live");
          setVerificationResult(null);
          setVerificationError(null);
          
          stopCamera();
        }
      } catch (err) {
        console.error("Failed to capture photo:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 4) Modal logic
  const openProofModal = (task: Task) => {
    setActiveProofTask(task);
    setPreviewImage(task.proofImage || null);
    setUploadMethod(task.uploadMethod || (task.proofImage ? "upload" : "live"));
    setVerificationResult(task.verification || null);
    setVerificationError(null);
    setIsDragActive(false);

    if (task.verification) {
      setCeremonyStep(5);
      setIsAnimatingGauge(true);
      setStampSlammed(true);
    } else {
      setCeremonyStep(0);
      setIsAnimatingGauge(false);
      setStampSlammed(false);
      
      // Auto-start camera if we are in live mode and no preview image yet
      if (!task.proofImage) {
        setTimeout(() => {
          startCamera();
        }, 150);
      }
    }
  };

  const closeProofModal = () => {
    stopCamera();
    setActiveProofTask(null);
    setPreviewImage(null);
    setUploadMethod(null);
    setVerificationResult(null);
    setVerificationError(null);
    setCeremonyStep(0);
    setIsAnimatingGauge(false);
    setStampSlammed(false);
  };

  // Convert uploaded files to base64
  const processMetadataImage = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setUploadMethod("upload");
      setVerificationResult(null);
      setVerificationError(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processMetadataImage(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processMetadataImage(e.dataTransfer.files[0]);
    }
  };

  // 5) Submit proof to Gemini models
  const handleVerifySubmission = async () => {
    if (!activeProofTask || !previewImage) return;

    setIsVerifying(true);
    setVerificationError(null);
    setRetryMessage(null);
    setIsRetrying(false);
    setLastTransientVerification(false);
    
    // Set ceremony states for the cinematic scan
    setCeremonyStep(1);
    setIsAnimatingGauge(false);
    setStampSlammed(false);

    // Optimistically update the status representation in task list
    const originalTasks = [...tasks];
    const updatedWithProof = tasks.map(t => {
      if (t.id === activeProofTask.id) {
        return {
          ...t,
          status: "awaiting-proof" as const,
          proofImage: previewImage
        };
      }
      return t;
    });
    setTasks(updatedWithProof);

    try {
      // 1. Compute perceptual hash client-side
      const hash = await computePerceptualHash(previewImage);
      
      // 2. Compare against other tasks
      const isDuplicate = tasks.some(t => t.id !== activeProofTask.id && t.proofHash === hash && t.proofImage);
      
      if (isDuplicate) {
        // Intercept immediately with local duplicate detection (bypass Gemini call)
        const result: TaskVerification = {
          verified: false,
          confidence: 1.0,
          matchedEvidence: "Duplicate proof image detected in local submission history.",
          mismatchReason: "You've submitted this exact image before.",
          followUpQuestion: "To keep this to-do list honest, please take a new photo or upload a different verification image.",
          verdictReason: "You've submitted this exact image before. Reusing evidence is a violation of the accountability contract.",
          evidenceRegion: null,
          authenticityFlag: "looks_duplicated"
        };

        const finalTasks = originalTasks.map(t => {
          if (t.id === activeProofTask.id) {
            return {
              ...t,
              status: "rejected" as const,
              proofImage: previewImage,
              uploadMethod: uploadMethod || "upload",
              proofHash: hash,
              verification: result
            };
          }
          return t;
        });

        saveTasks(finalTasks);
        setVerificationResult(result);

        const updatedActiveTask = finalTasks.find(t => t.id === activeProofTask.id);
        if (updatedActiveTask) {
          setActiveProofTask(updatedActiveTask);
        }

        // Start timed cinematic ceremony sequence directly
        setIsVerifying(false);
        setCeremonyStep(2);

        setTimeout(() => {
          setCeremonyStep(3);
          setTimeout(() => {
            setCeremonyStep(4);
            setTimeout(() => {
              setCeremonyStep(5);
              setTimeout(() => {
                setIsAnimatingGauge(true);
                setTimeout(() => {
                  setStampSlammed(true);
                }, 400);
              }, 300);
            }, 1200);
          }, 1200);
        }, 1200);

        return;
      }

      // 3. Normal path: fetch Gemini verification
      const response = await fetchWithExponentialBackoff(
        "/api/tasks/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: activeProofTask,
            imageData: previewImage
          })
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryMessage("Gemini is busy right now — retrying...");
        }
      );

      const result: TaskVerification = await response.json();
      
      const finalTasks = originalTasks.map(t => {
        if (t.id === activeProofTask.id) {
          return {
            ...t,
            status: (result.verified ? "verified" : "rejected") as Task["status"],
            proofImage: previewImage,
            uploadMethod: uploadMethod || "upload",
            proofHash: hash,
            verification: result
          };
        }
        return t;
      });

      saveTasks(finalTasks);
      setVerificationResult(result);
      
      // Update our modal view status representing the active task
      const updatedActiveTask = finalTasks.find(t => t.id === activeProofTask.id);
      if (updatedActiveTask) {
        setActiveProofTask(updatedActiveTask);
      }

      // Start timed cinematic ceremony sequence
      setIsVerifying(false);
      setCeremonyStep(2);

      setTimeout(() => {
        setCeremonyStep(3);
        setTimeout(() => {
          setCeremonyStep(4);
          setTimeout(() => {
            setCeremonyStep(5);
            setTimeout(() => {
              setIsAnimatingGauge(true);
              setTimeout(() => {
                setStampSlammed(true);
                if (result.verified && navigator.vibrate) {
                  navigator.vibrate([100, 50, 100]);
                }
              }, 400);
            }, 300);
          }, 1200);
        }, 1200);
      }, 1200);

    } catch (err: any) {
      console.error(err);
      // Rollback status
      setTasks(originalTasks);
      
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();
      const isTransient = errMsgLower.includes("unavailable") || 
                          errMsgLower.includes("503") || 
                          errMsgLower.includes("429") || 
                          errMsgLower.includes("resource_exhausted") || 
                          errMsgLower.includes("resource has been exhausted") || 
                          errMsgLower.includes("overloaded") || 
                          errMsgLower.includes("high demand") || 
                          errMsgLower.includes("busy");

      if (isTransient) {
        setLastTransientVerification(true);
        setVerificationError("The verifier is busy — tap to try again");
      } else {
        setLastTransientVerification(false);
        setVerificationError(errMsg.includes("API_KEY") ? "Gemini API key is missing or invalid. Please configure your key in Settings > Secrets." : "An error occurred during verification. Please make sure the uploaded image is valid.");
      }
      setIsVerifying(false);
      // Stay on step 1 so error is rendered inside the scanning state container
      setCeremonyStep(1);
    } finally {
      setRetryMessage(null);
      setIsRetrying(false);
    }
  };

  // AI Daily Plan Generation
  const handlePlanDay = async () => {
    const eligibleTasks = tasks.filter(t => t.status === "pending" || t.status === "awaiting-proof" || t.status === "rejected");
    if (eligibleTasks.length === 0) {
      setPlanError("You don't have any pending or overdue tasks to schedule! Create some tasks first.");
      setDailyPlan(null);
      setShowPlanPanel(true);
      return;
    }

    setIsPlanning(true);
    setPlanError(null);
    setRetryMessage(null);
    setIsRetrying(false);
    setLastTransientPlan(false);
    setShowPlanPanel(true);

    try {
      const response = await fetchWithExponentialBackoff(
        "/api/tasks/plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: eligibleTasks.map(t => ({
              title: t.title,
              deadline: t.deadline,
              priority: t.priority,
              description: t.description
            })),
            currentDateTime: new Date().toISOString()
          })
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryMessage("Gemini is busy right now — retrying...");
        }
      );

      const result: DailyPlan = await response.json();
      setDailyPlan(result);
      setPlanError(null);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();
      const isTransient = errMsgLower.includes("unavailable") || 
                          errMsgLower.includes("503") || 
                          errMsgLower.includes("429") || 
                          errMsgLower.includes("resource_exhausted") || 
                          errMsgLower.includes("resource has been exhausted") || 
                          errMsgLower.includes("overloaded") || 
                          errMsgLower.includes("high demand") || 
                          errMsgLower.includes("busy");

      if (isTransient) {
        setLastTransientPlan(true);
        setPlanError("The AI is experiencing high demand. Please try again in a moment.");
      } else {
        setLastTransientPlan(false);
        setPlanError(errMsg.includes("API_KEY") ? "Gemini API key is missing or invalid. Please configure your key in Settings > Secrets." : "An error occurred while generating your daily plan. Please try again.");
      }
      setDailyPlan(null);
    } finally {
      setIsPlanning(false);
      setRetryMessage(null);
      setIsRetrying(false);
    }
  };

  // Copy to Clipboard Helper
  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Autonomous Escalation Trigger
  const handleEscalateTask = async (task: Task) => {
    const remainingTasks = tasks.filter(t => t.id !== task.id && (t.status === "pending" || t.status === "awaiting-proof" || t.status === "rejected"));
    
    setEscalatingTaskId(task.id);
    setEscalationErrors(prev => ({ ...prev, [task.id]: null }));
    setEscalationLastTransient(prev => ({ ...prev, [task.id]: false }));
    setRetryMessage(null);
    setIsRetrying(false);

    try {
      const response = await fetchWithExponentialBackoff(
        "/api/tasks/escalate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overdueTask: {
              title: task.title,
              description: task.description,
              deadline: task.deadline,
              priority: task.priority
            },
            remainingTasks: remainingTasks.map(t => ({
              title: t.title,
              deadline: t.deadline,
              priority: t.priority
            })),
            currentDateTime: new Date().toISOString()
          })
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryMessage("Gemini is busy right now — retrying...");
        }
      );

      const result: EscalationResponse = await response.json();
      setEscalationResults(prev => ({ ...prev, [task.id]: result }));
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();
      const isTransient = errMsgLower.includes("unavailable") || 
                          errMsgLower.includes("503") || 
                          errMsgLower.includes("429") || 
                          errMsgLower.includes("resource_exhausted") || 
                          errMsgLower.includes("resource has been exhausted") || 
                          errMsgLower.includes("overloaded") || 
                          errMsgLower.includes("high demand") || 
                          errMsgLower.includes("busy");

      if (isTransient) {
        setEscalationLastTransient(prev => ({ ...prev, [task.id]: true }));
        setEscalationErrors(prev => ({ ...prev, [task.id]: "The AI is experiencing high demand. Please try again in a moment." }));
      } else {
        setEscalationLastTransient(prev => ({ ...prev, [task.id]: false }));
        setEscalationErrors(prev => ({ ...prev, [task.id]: errMsg.includes("API_KEY") ? "Gemini API key is missing or invalid. Please configure your key in Settings > Secrets." : "An error occurred while generating recovery options." }));
      }
    } finally {
      setEscalatingTaskId(null);
      setRetryMessage(null);
      setIsRetrying(false);
    }
  };

  // Start Evening Reckoning Ritual
  const startEveningReckoning = () => {
    const activeTasks = tasks;
    
    // Proven today: tasks with status === "verified"
    const proven = activeTasks.filter(t => t.status === "verified");
    
    // Unproven today: tasks with status === "pending" or "awaiting-proof" (committed but unproven)
    const unproven = activeTasks.filter(t => t.status === "pending" || t.status === "awaiting-proof");
    
    setReckoningProven(proven);
    setReckoningUnproven(unproven);
    setIsReckoningActive(true);
    setReckoningStep("intro");
    
    // Outcomes:
    // If there is at least one unproven task, it breaks the streak (fail)
    // If all commitments have been proven (0 unproven tasks), the streak increments (pass)
    setReckoningOutcome(unproven.length === 0 ? "pass" : "fail");
    setReckoningEscalationLines(unproven.map(t => ({
      taskId: t.id,
      taskTitle: t.title,
      status: "pending" as const
    })));
    setEscalatingIndex(-1);
    setCurrentProvenCount(0);
    setCurrentUnprovenCount(0);
  };

  // Run the counting tally animation
  const runReckoningTally = () => {
    setReckoningStep("counting");
    
    let prov = 0;
    let unprov = 0;
    const targetProv = reckoningProven.length;
    const targetUnprov = reckoningUnproven.length;
    
    setCurrentProvenCount(0);
    setCurrentUnprovenCount(0);

    const maxSteps = Math.max(targetProv, targetUnprov);
    if (maxSteps === 0) {
      setTimeout(() => {
        setReckoningStep("resolving");
      }, 1000);
      return;
    }

    const interval = setInterval(() => {
      let updated = false;
      if (prov < targetProv) {
        prov++;
        setCurrentProvenCount(prov);
        updated = true;
      }
      if (unprov < targetUnprov) {
        unprov++;
        setCurrentUnprovenCount(unprov);
        updated = true;
      }
      
      if (!updated) {
        clearInterval(interval);
        setTimeout(() => {
          setReckoningStep("resolving");
        }, 1200);
      }
    }, 150);
  };

  // Run the autonomous escalation sequence
  const runAutonomousReckonEscalation = async () => {
    setReckoningStep("escalating");
    const updatedTasks = [...tasks];
    
    for (let i = 0; i < reckoningUnproven.length; i++) {
      const task = reckoningUnproven[i];
      setEscalatingIndex(i);
      
      const remainingTasks = tasks.filter(
        t => t.id !== task.id && (t.status === "pending" || t.status === "awaiting-proof" || t.status === "rejected")
      );

      try {
        const response = await fetchWithExponentialBackoff(
          "/api/tasks/escalate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              overdueTask: {
                title: task.title,
                description: task.description,
                deadline: task.deadline,
                priority: task.priority
              },
              remainingTasks: remainingTasks.map(t => ({
                title: t.title,
                deadline: t.deadline,
                priority: t.priority
              })),
              currentDateTime: new Date().toISOString()
            })
          },
          (attempt) => {
            console.log(`Reckoning escalation attempt ${attempt} retrying...`);
          }
        );

        const escResult: EscalationResponse = await response.json();
        
        // Update lines status
        setReckoningEscalationLines(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "done", recovery: escResult };
          return next;
        });

        // Store escalation directly inside task list
        const taskIdx = updatedTasks.findIndex(t => t.id === task.id);
        if (taskIdx !== -1) {
          updatedTasks[taskIdx] = {
            ...updatedTasks[taskIdx],
            status: "rejected",
            isUnproven: true,
            escalation: escResult,
            verification: {
              verified: false,
              confidence: 1.0,
              matchedEvidence: "Marked as unproven during the Evening Reckoning ritual.",
              mismatchReason: "This task was not completed or proven by the end-of-day deadline.",
              followUpQuestion: "Urgency has been raised. Re-blocked for tomorrow.",
              verdictReason: "The user failed to submit forensic proof of completion before the Evening Reckoning.",
              authenticityFlag: "unrelated"
            }
          };
        }
      } catch (err) {
        console.error("Autonomous escalation failed for task:", task.title, err);
        setReckoningEscalationLines(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "error" };
          return next;
        });

        const taskIdx = updatedTasks.findIndex(t => t.id === task.id);
        if (taskIdx !== -1) {
          updatedTasks[taskIdx] = {
            ...updatedTasks[taskIdx],
            status: "rejected",
            isUnproven: true,
            verification: {
              verified: false,
              confidence: 1.0,
              matchedEvidence: "Marked as unproven during the Evening Reckoning ritual.",
              mismatchReason: "This task was not completed or proven by the end-of-day deadline.",
              followUpQuestion: "Urgency has been raised. Re-blocked for tomorrow.",
              verdictReason: "The user failed to submit forensic proof of completion before the Evening Reckoning.",
              authenticityFlag: "unrelated"
            }
          };
        }
      }
      
      // Delay for cinematic pacing
      await new Promise(r => setTimeout(r, 600));
    }
    
    setEscalatingIndex(-1);
    saveTasks(updatedTasks);
    setReckoningStep("complete");
  };

  // Filter & sort remaining tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    // Verified or Rejected tasks sink to the bottom
    const scoreA = a.status === "verified" || a.status === "rejected" ? 1 : 0;
    const scoreB = b.status === "verified" || b.status === "rejected" ? 1 : 0;
    if (scoreA !== scoreB) return scoreA - scoreB;
    
    // Otherwise sort chronologically by deadline
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="verification-shell min-h-screen pb-16 relative z-10 antialiased font-sans">
      
      {/* 1) Top Header Bar & Identity */}
      <header className="sticky top-0 z-15 bg-brand-bg/90 backdrop-blur-md border-b border-brand-primary/10">
        <div id="header-container" className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-well border border-brand-accent/20 p-2.5 rounded-xl text-brand-accent flex items-center justify-center">
              <Flame className="w-6 h-6 text-brand-accent animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-brand-primary flex items-center gap-2">
                StayOnTrack <span className="bg-brand-well text-brand-accent text-[10px] font-mono px-2 py-0.5 rounded border border-brand-accent/20 font-normal uppercase tracking-wider">Forensic Trust</span>
              </h1>
              <p className="text-xs text-brand-secondary">The task verification cockpit you literally cannot lie to.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Morning Plan Ritual */}
            <button
              onClick={handlePlanDay}
              disabled={isPlanning}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-bg bg-brand-accent hover:brightness-110 disabled:bg-brand-accent/50 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,230,118,0.25)] border border-brand-accent/30 transition-all cursor-pointer shrink-0"
              title="Generate a time-blocked daily schedule using AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isPlanning ? "animate-spin" : ""}`} />
              Morning Plan
            </button>
            
            {/* Evening Reckoning Ritual */}
            <button
              onClick={startEveningReckoning}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.35)] border border-purple-500/30 transition-all cursor-pointer shrink-0"
              title="Run the dramatic Evening Reckoning to lock in your streak or engage recovery"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              Evening Reckoning
            </button>

            <div className="h-4 w-[1px] bg-brand-primary/15 hidden md:block"></div>
            <button
              onClick={handleResetToSeeds}
              className="inline-flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-primary font-medium px-2 py-1 rounded hover:bg-brand-card/50 transition-colors cursor-pointer hidden md:flex shrink-0"
              title="Reset tasks to default state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
            <div className="h-4 w-[1px] bg-brand-primary/15"></div>
            <a 
              href="https://ai.studio/build" 
              target="_blank" 
              className="text-[11px] font-semibold text-brand-accent bg-brand-well border border-brand-accent/20 rounded px-2 py-1 flex items-center gap-1 hover:bg-brand-card/50 transition-all"
            >
              <span>Built in AI Studio</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* API Key Missing Alert banner */}
        {isKeyConfigured === false && (
          <div className="lg:col-span-12 bg-brand-well/60 border border-amber-500/20 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-3 bg-brand-card border border-amber-500/10 rounded-xl shadow-xs text-amber-500 shrink-0 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" />
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-sm font-bold text-brand-primary font-display flex items-center justify-center sm:justify-start gap-1.5">
                Gemini API Key Required to Activate AI
                <span className="bg-rose-500/10 text-rose-400 text-[10px] font-mono px-2 py-0.5 rounded border border-rose-500/20 font-normal uppercase tracking-wider">Deactivated</span>
              </h3>
              <p className="text-xs text-brand-secondary leading-relaxed max-w-4xl">
                StayOnTrack utilizes <strong className="text-brand-primary font-mono">models/gemini-2.5-flash</strong> via the official Google GenAI SDK to automatically resolve relative task deadlines, parse natural language, and verify photo proof of completion. Please supply your API Key to play with the AI functionality.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs border-t border-brand-primary/10 mt-2">
                <span className="font-semibold text-brand-primary">Follow these 3 simple steps to integrate your key:</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] text-brand-secondary">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-[9px] font-bold">1</span>
                    Get free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-brand-accent hover:brightness-110">Google AI Studio key page</a>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-[9px] font-bold">2</span>
                    Open <strong>Secrets Settings</strong> panel in upper-right corner of AI Studio interface
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-[9px] font-bold">3</span>
                    Add secret <code className="bg-brand-well border border-brand-primary/10 px-1 py-0.5 rounded font-mono font-bold text-amber-400">GEMINI_API_KEY</code> with your key!
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Daily Plan Panel */}
        {showPlanPanel && (
          <div className="lg:col-span-12 bg-brand-card border border-brand-primary/10 p-6 rounded-2xl shadow-xl card-shadow flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-brand-well border border-brand-accent/20 p-2 rounded-xl text-brand-accent shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-brand-primary font-display flex items-center gap-2">
                    🌅 Morning Plan Ritual
                    {isPlanning && (
                      <span className="bg-brand-well text-brand-accent text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold border border-brand-accent/20 animate-pulse">
                        Coaching blueprint...
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-brand-secondary">The start of your daily accountability ritual. Align your focus windows with Gemini's time-blocking.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanPanel(false)}
                className="p-1.5 hover:bg-brand-well rounded-lg text-brand-secondary hover:text-brand-primary transition-colors cursor-pointer"
                title="Dismiss panel"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Error view */}
            {planError && (
              <div className="text-xs text-rose-400 bg-brand-well border border-rose-500/20 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
                <div className="flex gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-bold text-rose-300">
                      {lastTransientPlan ? "AI Overloaded" : "Planning Problem"}
                    </p>
                    <p className="text-brand-secondary mt-1 leading-relaxed">{planError}</p>
                  </div>
                </div>
                {lastTransientPlan && (
                  <button
                    type="button"
                    onClick={() => handlePlanDay()}
                    disabled={isPlanning}
                    className="self-end px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:bg-rose-500/5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Blueprint Generation
                  </button>
                )}
              </div>
            )}

            {/* Loading view */}
            {isPlanning && (
              <div className="p-8 bg-brand-well/60 border border-brand-primary/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-center animate-pulse">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-brand-accent" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-brand-primary font-display">Analyzing workloads & deadline priorities...</p>
                  <p className="text-[10px] text-brand-accent font-medium font-mono">
                    {retryMessage || "Running step: calculating sequential focus windows with Gemini..."}
                  </p>
                </div>
              </div>
            )}

            {/* Render schedule blocks */}
            {dailyPlan && dailyPlan.schedule && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyPlan.schedule.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-brand-well/50 border border-dashed border-brand-primary/10 rounded-2xl">
                    <Calendar className="w-8 h-8 text-brand-tertiary mx-auto mb-2" />
                    <p className="text-xs text-brand-secondary font-medium">No schedule items generated. Add pending tasks first!</p>
                  </div>
                ) : (
                  dailyPlan.schedule.map((block, index) => (
                    <div 
                      key={index}
                      className="group bg-brand-well border border-brand-primary/5 rounded-2xl p-4 shadow-sm hover:border-brand-accent/20 transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden well-shadow"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent rounded-l-2xl"></div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-brand-card text-brand-accent text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 border border-brand-accent/10">
                            <Clock className="w-3 h-3" />
                            {block.suggestedTimeBlock}
                          </span>
                          <span className="text-[10px] text-brand-tertiary font-mono">
                            Slot #{index + 1}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-brand-primary leading-snug group-hover:text-brand-accent transition-colors">
                          {block.taskTitle}
                        </h3>
                      </div>
                      <div className="text-[11px] text-brand-secondary leading-relaxed bg-brand-card/50 border border-brand-primary/5 rounded-xl p-3 flex gap-1.5 items-start mt-1 font-mono italic">
                        <span className="text-brand-accent font-serif text-lg leading-none shrink-0">“</span>
                        <p>{block.reasoning}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Left Column: Stats overview + Prompt Input (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* A) Accountability Dashboard Stats */}
          <div id="stats-dashboard" className="bg-brand-card border border-brand-primary/10 p-6 rounded-2xl shadow-xl card-shadow space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-brand-primary/10">
              <h2 className="text-xs font-semibold text-brand-tertiary font-display tracking-widest uppercase">Accountability stats</h2>
              <span className="text-[10px] text-brand-accent/80 font-mono font-bold tracking-wider">SECURE PROOF ENGINE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Flame Streak */}
              <div id="stat-streak" className="bg-brand-well border border-amber-500/20 p-4 rounded-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="absolute right-2 top-2 text-amber-500/5">
                  <Flame className="w-10 h-10 stroke-[1]" />
                </div>
                <p className="text-[11px] text-amber-500 font-bold font-sans">Active Streak</p>
                
                <div className="flex items-center gap-2 justify-center my-1.5">
                  <motion.div
                    animate={stats.streak > 0 ? {
                      scale: [1, 1.15, 1],
                      rotate: [0, -5, 5, -5, 0],
                    } : {}}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="text-amber-500"
                  >
                    <Flame className="w-8 h-8 fill-amber-500/10 stroke-[2]" />
                  </motion.div>
                  <span className="text-3xl font-extrabold font-mono text-amber-500">
                    {stats.streak}
                  </span>
                </div>
                
                <p className="text-[9px] text-amber-500/80 font-semibold uppercase tracking-wider font-mono">
                  {stats.streak === 1 ? 'Day Active' : 'Days Active'}
                </p>
                
                <div className="mt-3 pt-2.5 border-t border-amber-500/10 w-full">
                  <p className="text-[10px] text-amber-500/95 font-medium leading-relaxed font-sans">
                    {stats.streak > 0 
                      ? `Prove a task today to keep your ${stats.streak}-day streak`
                      : "Prove a task today to ignite your streak!"}
                  </p>
                </div>
              </div>

              {/* Commitment Circular Ring */}
              <div id="stat-commitment" className="bg-brand-well border border-brand-accent/20 p-4 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[inset_0_1px_10px_rgba(0,230,118,0.03)]">
                <div className="absolute right-2 top-2 text-brand-accent/5">
                  <Target className="w-10 h-10 stroke-[1]" />
                </div>
                <p className="text-[11px] text-brand-accent font-bold font-sans">Commitment</p>
                
                <div className="relative w-20 h-20 flex items-center justify-center my-0.5">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="stroke-zinc-800/80 fill-none"
                      strokeWidth="5"
                    />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="fill-none"
                      stroke="#00E676"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                      animate={{ strokeDashoffset: (2 * Math.PI * 32) - (stats.commitmentRate / 100) * (2 * Math.PI * 32) }}
                      transition={{ duration: 1.4, ease: "easeOut" }}
                      style={{
                        strokeDasharray: 2 * Math.PI * 32,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold font-mono text-[#00E676]">
                      {stats.commitmentRate}%
                    </span>
                    <span className="text-[8px] text-brand-secondary/40 font-mono uppercase tracking-wider">Rate</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-2.5 border-t border-brand-accent/10 w-full">
                  <p className="text-[10px] text-brand-secondary/70 font-mono">
                    Pass rate among completed
                  </p>
                </div>
              </div>
            </div>

            {/* VERIFIED-DAYS GRID */}
            <div className="bg-brand-well border border-brand-primary/10 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[11px] font-semibold text-brand-secondary uppercase tracking-widest font-display">Integrity Grid</p>
                <span className="text-[9px] text-[#00E676] font-mono font-semibold">28-day tracker</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1 px-1 py-1">
                {gridDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square w-full rounded-sm transition-all duration-300 relative group border ${
                      day.verified
                        ? "bg-[#00E676] border-[#00E676] shadow-[0_0_6px_rgba(0,230,118,0.35)]"
                        : "bg-brand-card/30 border-brand-primary/5 hover:border-brand-primary/10"
                    }`}
                  >
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 text-brand-primary text-[8px] font-mono py-1 px-1.5 rounded-md whitespace-nowrap z-50 border border-brand-primary/10">
                      {day.label}: {day.verified ? "Verified" : "Empty"}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-[10px] text-brand-secondary/60 mt-2 font-sans leading-relaxed text-center italic">
                "Every green square is a photo you actually took."
              </p>
            </div>

            {/* PROVEN-VS-REJECTED LEDGER */}
            <div className="bg-brand-well border border-brand-primary/10 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2.5">
                <p className="text-[11px] font-semibold text-brand-secondary uppercase tracking-widest font-display">Submissions Ledger</p>
                <span className="text-[9px] text-brand-tertiary font-mono">honest record</span>
              </div>
              
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-5 border border-dashed border-brand-primary/5 rounded-lg">
                  <p className="text-[10px] text-brand-tertiary font-mono">No submissions recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {recentSubmissions.map((t) => {
                    const isVerified = t.status === "verified";
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-brand-card/30 border border-brand-primary/5 hover:border-brand-primary/10 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          {isVerified ? (
                            <div className="p-0.5 rounded bg-[#00E676]/10 text-[#00E676] shrink-0">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          ) : (
                            <div className="p-0.5 rounded bg-rose-500/10 text-rose-500 shrink-0">
                              <XCircle className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-brand-primary truncate max-w-[140px] sm:max-w-[180px]">
                              {t.title}
                            </p>
                            <p className="text-[8px] text-brand-tertiary font-mono">
                              {formatDateTime(t.deadline)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${isVerified ? "text-[#00E676]" : "text-rose-400"}`}>
                          {isVerified ? "PROVEN" : "REJECTED"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mini Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-brand-primary/10 text-[10px]">
                <div className="flex flex-col items-center p-1.5 rounded bg-brand-card/20 border border-brand-primary/5">
                  <span className="text-brand-tertiary uppercase text-[8px] tracking-wider font-semibold">Proven</span>
                  <span className="font-mono font-extrabold text-brand-accent mt-0.5">{stats.verifiedCount}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded bg-brand-card/20 border border-brand-primary/5">
                  <span className="text-brand-tertiary uppercase text-[8px] tracking-wider font-semibold">Rejected</span>
                  <span className="font-mono font-extrabold text-rose-500 mt-0.5">{stats.rejectedCount}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded bg-brand-card/20 border border-brand-primary/5">
                  <span className="text-brand-tertiary uppercase text-[8px] tracking-wider font-semibold">Overdue</span>
                  <span className="font-mono font-extrabold text-amber-500 mt-0.5">{stats.overdueCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* B) Create Task with AI Engine */}
          <div id="add-task-card" className="bg-brand-card border border-brand-primary/10 p-6 rounded-2xl shadow-xl card-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/2 rounded-full blur-2xl -z-5"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-brand-well border border-brand-accent/20 text-brand-accent">
                <Sparkles className="w-4 h-4 text-brand-accent animate-pulse" />
              </div>
              <h2 className="text-base font-bold font-display text-brand-primary">Add with AI Parsing</h2>
            </div>
            
            <p className="text-xs text-brand-secondary mb-4 leading-relaxed">
              Describe your task in natural relative terms. Our Gemini Flash model will instantly extract structured deadlines and priority goals.
            </p>

            <form onSubmit={handleAddTaskSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g. 'Submit DBMS assignment by 3pm tomorrow' or 'Pay utility bills this Friday night'"
                  rows={3}
                  className="w-full text-sm rounded-xl border border-brand-primary/10 pl-3.5 pr-12 py-3.5 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent/30 placeholder:text-brand-tertiary bg-brand-well text-brand-primary transition-all font-sans"
                  disabled={isParsing}
                  required
                />
                
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-3.5 bottom-3.5 p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                      isListening 
                        ? "bg-rose-600 text-white animate-pulse shadow-sm" 
                        : "bg-brand-card hover:bg-brand-card/80 text-brand-secondary hover:text-brand-primary border border-brand-primary/5"
                    }`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {isListening && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="font-mono text-[10px]">Listening... speak your task clearly. Click the mic button to finish.</span>
                </div>
              )}

              {parseError && (
                <div className="text-xs text-rose-400 bg-brand-well border border-rose-500/20 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <p className="font-bold text-rose-300">
                        {lastTransientParse ? "AI Overloaded" : "Resolution Problem"}
                      </p>
                      <p className="text-brand-secondary mt-1 leading-relaxed">{parseError}</p>
                    </div>
                  </div>
                  {lastTransientParse && (
                    <button
                      type="button"
                      onClick={() => handleAddTaskSubmit()}
                      disabled={isParsing}
                      className="self-end px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/20 text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-xs disabled:bg-rose-500/5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Parse
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isParsing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-brand-bg bg-brand-accent hover:brightness-110 disabled:bg-brand-accent/50 rounded-xl shadow-[0_0_15px_rgba(0,230,118,0.2)] transition-all border border-brand-accent/30 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-brand-bg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {retryMessage || "Extracting structured deadlines..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Parse &amp; Append Task
                  </>
                )}
              </button>
            </form>

            {/* Micro-Interaction Seed Buttons */}
            <div className="mt-5 pt-4 border-t border-brand-primary/10">
              <span className="text-[10px] font-bold text-brand-tertiary uppercase tracking-widest block mb-2">Try examples</span>
              <div className="flex flex-col gap-1.5">
                {suggestedPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setNaturalLanguageInput(p.text)}
                    disabled={isParsing}
                    className="text-left text-xs bg-brand-well hover:bg-brand-card border border-brand-primary/5 hover:border-brand-accent/20 rounded-lg p-2 transition-all flex justify-between items-center group text-brand-secondary hover:text-brand-primary"
                  >
                    <span className="truncate pr-2">{p.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-brand-tertiary group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Guide */}
          <div className="bg-brand-well border border-brand-primary/10 rounded-2xl p-5 text-xs text-brand-secondary">
            <h4 className="font-bold flex items-center gap-1.5 text-brand-primary mb-2">
              <Info className="w-4 h-4 text-brand-accent shrink-0" />
              How StayOnTrack Works
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-brand-secondary">
              <li>Type in tasks in natural conversational english.</li>
              <li>Wait for the deadline to approach or click <strong className="text-brand-accent">Submit Proof</strong>.</li>
              <li>Upload screenshot code editor, receipts, or workout photos.</li>
              <li>Gemini reads the visual pixels contextually against your text.</li>
              <li>If validated, streak increments! If rejected, fail reasons appear!</li>
            </ol>
          </div>

        </div>

        {/* Right Column: Task Cards List (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-brand-primary/10 pb-3">
            <div>
              <h2 className="text-xl font-bold font-display text-brand-primary">Your Action Board</h2>
              <p className="text-xs text-brand-secondary">Sorted by pressing deadlines and forensic due dates.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-well text-brand-accent border border-brand-accent/20 font-mono">
              Total: {tasks.length}
            </span>
          </div>

          {/* Evening Reckoning Banner */}
          {new Date().getHours() >= 17 && tasks.some(t => t.status === "pending" || t.status === "awaiting-proof") && (
            <div className="bg-gradient-to-r from-purple-950/40 via-brand-well/60 to-purple-950/40 border border-purple-500/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.15)] flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 animate-pulse shrink-0">
                  <Flame className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 font-display flex items-center gap-2 text-sm">
                    🌌 Evening Verification Reckoning Ready
                  </h3>
                  <p className="text-xs text-brand-secondary mt-0.5">
                    It's past 5:00 PM. Run the reckoning to lock in your daily flame streak or initiate autonomous agent recovery.
                  </p>
                </div>
              </div>
              <button
                onClick={startEveningReckoning}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all cursor-pointer shrink-0 border border-purple-400/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                End My Day & Reckon
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {sortedTasks.length === 0 ? (
            <div className="bg-brand-card border border-dashed border-brand-primary/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-brand-well border border-brand-primary/5 text-brand-accent rounded-full">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-brand-primary">No active commitments</h3>
                <p className="text-xs text-brand-secondary mt-1 max-w-sm">
                  Add commitments like "Do chemistry quiz tonight by 9pm" using the AI parsing box on your left to begin!
                </p>
              </div>
            </div>
          ) : (
            <div id="task-grid" className="grid grid-cols-1 gap-4">
              {sortedTasks.map((task) => {
                const { isOverdue, isDueSoon, timeLabel } = getDeadlineStatus(task.deadline);
                const isCompleted = task.status === "verified" || task.status === "rejected";

                return (
                  <div
                    key={task.id}
                    id={`task-card-${task.id}`}
                    className={`bg-brand-card rounded-2xl border ${
                      isCompleted 
                        ? 'border-brand-primary/5 bg-brand-card/40 opacity-70' 
                        : isOverdue 
                        ? 'border-rose-500/30 hover:border-rose-500/50 ring-1 ring-rose-500/10' 
                        : isDueSoon 
                        ? 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_4px_15px_rgba(245,158,11,0.02)]' 
                        : 'border-brand-primary/10 hover:border-brand-accent/20 hover:shadow-[0_4px_15px_rgba(0,230,118,0.02)]'
                    } p-5 transition-all flex flex-col justify-between relative`}
                  >
                    {/* Header line context: Title and Trash button */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-bold font-sans text-brand-primary ${isCompleted ? 'text-brand-secondary/60 line-through' : ''}`}>
                            {task.title}
                          </h3>
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className={`text-xs ${isCompleted ? 'text-brand-tertiary' : 'text-brand-secondary'} leading-relaxed mr-4`}>
                          {task.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 px-1.5 text-brand-tertiary hover:text-rose-500 hover:bg-brand-well rounded transition-colors self-start shrink-0 cursor-pointer"
                        title="Delete task commitment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Agent is acting panel for overdue and unproven tasks */}
                    {((isOverdue && !isCompleted) || (task.status === "rejected" && task.isUnproven)) && (
                      <div className="mt-4 p-4 rounded-xl border border-rose-500/20 bg-brand-well/60 space-y-3">
                        {(() => {
                          const escData = escalationResults[task.id] || task.escalation;
                          return (
                            <>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg animate-pulse">
                                    <ShieldAlert className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-brand-primary font-display flex items-center gap-1.5">
                                      {task.isUnproven ? "Evening Reckoning Escalation" : "Agent Intervention Standing By"}
                                    </h4>
                                    <p className="text-[10px] text-brand-secondary">Autonomous recovery assistant is active.</p>
                                  </div>
                                </div>
                                
                                {/* Escalate / Retry Button */}
                                {!escData && (
                                  <button
                                    onClick={() => handleEscalateTask(task)}
                                    disabled={escalatingTaskId === task.id}
                                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {escalatingTaskId === task.id ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 text-rose-400" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Acting...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-3 h-3" />
                                        Escalate Task
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Loader/Retry Messages */}
                              {escalatingTaskId === task.id && (
                                <div className="text-[10px] font-mono text-brand-accent font-semibold animate-pulse flex items-center gap-1.5 bg-brand-well border border-brand-primary/5 p-2.5 rounded-xl shadow-xs">
                                  <Sparkles className="w-3 h-3 animate-spin text-brand-accent" />
                                  {retryMessage || "StayOnTrack agent is formulating extension drafts & recovery plans..."}
                                </div>
                              )}

                              {/* Error message */}
                              {escalationErrors[task.id] && (
                                <div className="text-[10px] text-rose-400 bg-brand-well border border-rose-500/20 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                                  <p className="font-bold">{escalationLastTransient[task.id] ? "AI Overloaded" : "Escalation Failed"}</p>
                                  <p className="leading-normal">{escalationErrors[task.id]}</p>
                                  <button
                                    onClick={() => handleEscalateTask(task)}
                                    className="text-[9px] font-bold text-rose-300 underline hover:text-rose-200 font-mono cursor-pointer"
                                  >
                                    Retry Escalation Blueprint
                                  </button>
                                </div>
                              )}

                              {/* Escalation Output Displays */}
                              {escData && (
                                <div className="space-y-4 pt-3 border-t border-brand-primary/10 text-xs">
                                  
                                  {/* 1) Re-prioritized Recovery Plan */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase font-bold text-brand-secondary tracking-wider block">1) Re-prioritized Recovery Plan</span>
                                    <div className="bg-brand-card border border-brand-primary/5 rounded-xl divide-y divide-brand-primary/5 shadow-sm">
                                      {escData.recoveryPlan.length === 0 ? (
                                        <p className="text-[10px] text-brand-tertiary p-3 text-center">No other tasks in queue to reschedule.</p>
                                      ) : (
                                        escData.recoveryPlan.map((step: any, idx: number) => (
                                          <div key={idx} className="p-3 flex items-start gap-2 justify-between">
                                            <div className="space-y-0.5">
                                              <p className="font-bold text-brand-primary text-[11px]">{step.taskTitle}</p>
                                              <p className="text-brand-secondary text-[10px] leading-relaxed">{step.actionItem}</p>
                                            </div>
                                            <span className="bg-brand-well text-brand-accent text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border border-brand-accent/10 shrink-0">
                                              {step.timing}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {/* 2) Extension Request Draft */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] uppercase font-bold text-brand-secondary tracking-wider">2) Extension Request Draft</span>
                                      <button
                                        onClick={() => handleCopyToClipboard(escData.extensionDraft, `${task.id}-draft`)}
                                        className="text-[10px] font-semibold text-brand-accent hover:brightness-110 flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        {copiedStates[`${task.id}-draft`] ? (
                                          <>
                                            <CheckCheck className="w-3.5 h-3.5 text-brand-accent" />
                                            <span className="text-brand-accent font-bold font-mono">Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Copy Draft
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="bg-brand-well border border-brand-primary/5 rounded-xl p-3 text-[10.5px] text-brand-secondary leading-relaxed font-mono max-h-[140px] overflow-y-auto whitespace-pre-wrap italic shadow-inner">
                                      {escData.extensionDraft}
                                    </div>
                                  </div>

                                  {/* 3) Accountability Buddy Message */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] uppercase font-bold text-brand-secondary tracking-wider">3) Accountability Buddy Text</span>
                                      <button
                                        onClick={() => handleCopyToClipboard(escData.buddyHeadsUp, `${task.id}-buddy`)}
                                        className="text-[10px] font-semibold text-brand-accent hover:brightness-110 flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        {copiedStates[`${task.id}-buddy`] ? (
                                          <>
                                            <CheckCheck className="w-3.5 h-3.5 text-brand-accent" />
                                            <span className="text-brand-accent font-bold font-mono">Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-brand-accent" />
                                            Copy Note
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="bg-brand-well border border-brand-primary/5 rounded-xl p-3 text-[10.5px] text-brand-secondary leading-relaxed font-mono italic flex gap-1.5 items-start">
                                      <span className="text-brand-accent font-serif text-lg leading-none shrink-0">“</span>
                                      <p>{escData.buddyHeadsUp}</p>
                                    </div>
                                  </div>

                                  {/* Clear option */}
                                  {!task.isUnproven && (
                                    <div className="flex justify-end pt-1">
                                      <button
                                        onClick={() => {
                                          setEscalationResults(prev => {
                                            const copy = { ...prev };
                                            delete copy[task.id];
                                            return copy;
                                          });
                                        }}
                                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                      >
                                        Re-escalate Recovery Plan
                                      </button>
                                    </div>
                                  )}

                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Metadata indicators: Deadline badge + Submit Proof button */}
                    <div className="mt-5 pt-3 border-t border-brand-primary/10 flex flex-wrap items-center justify-between gap-3">
                      
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-brand-secondary">
                          <Calendar className="w-3.5 h-3.5 text-brand-tertiary" />
                          <span>{formatDateTime(task.deadline)}</span>
                        </div>
                        
                        {/* Due Countdown badges */}
                        {!isCompleted && (
                          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isOverdue 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' 
                              : isDueSoon 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-brand-well text-brand-secondary border-brand-primary/10'
                          }`}>
                            {timeLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(task)}

                        {!isCompleted && (
                          <button
                            onClick={() => openProofModal(task)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all bg-brand-accent text-brand-bg border-brand-accent hover:brightness-110 shadow-[0_0_12px_rgba(0,230,118,0.2)] cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Submit Proof
                          </button>
                        )}

                        {/* If completed, allow inspecting verification findings */}
                        {isCompleted && task.verification && (
                          <button
                            onClick={() => openProofModal(task)}
                            className="inline-flex items-center gap-1 text-xs text-brand-accent font-bold hover:underline bg-brand-well px-2.5 py-1.5 rounded-lg border border-brand-primary/10 cursor-pointer"
                          >
                            Inspect Results
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Prompt banner for completed/verified reason micro-summary */}
                    {isCompleted && task.verification && (
                      <div className={`mt-3 py-2 px-3 text-[11px] rounded-lg border font-mono ${
                        task.status === "verified" 
                          ? 'bg-brand-well/80 text-brand-accent border-brand-accent/20' 
                          : 'bg-brand-well/80 text-rose-400 border-rose-500/20'
                      }`}>
                        <div className="flex gap-1.5">
                          <span className="font-bold underline uppercase tracking-wider text-[10px] shrink-0">Reasoning:</span>
                          <p className="line-clamp-2 italic text-brand-secondary">{task.verification.verified ? task.verification.matchedEvidence : task.verification.mismatchReason}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </main>

         {/* 6) PROOF-OF-COMPLETION MODAL (Hero Feature) */}
      {activeProofTask && (
        <div id="proof-modal" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          {/* Inject animations styles */}
          <style>{`
            @keyframes scanSweep {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
            @keyframes pulseHud {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.9; }
            }
            @keyframes stampSlam {
              0% { transform: scale(4.5) rotate(-18deg); opacity: 0; filter: blur(8px); }
              70% { transform: scale(0.95) rotate(-10deg); opacity: 0.9; }
              100% { transform: scale(1) rotate(-12deg); opacity: 1; filter: blur(0); }
            }
            @keyframes streakPulse {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.4)); }
              50% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.8)); }
            }
          `}</style>

          {ceremonyStep === 0 ? (
            /* ================= STEP 0: CARD MODAL FOR PREPARATION / FILE SELECTION ================= */
            <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in fade-in-50 zoom-in-95 duration-150">
              
              {/* Modal Title Bar */}
              <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-mono">Verify task completion</span>
                  <h3 className="text-lg font-bold text-zinc-100 font-display">{activeProofTask.title}</h3>
                </div>
                <button 
                  onClick={closeProofModal}
                  className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Task specification briefing summaries */}
              <div className="my-4 p-3 bg-zinc-950 border border-zinc-800/50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span className="font-mono text-[10px] uppercase">Task description</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {activeProofTask.priority} priority
                  </span>
                </div>
                <p className="text-zinc-200 font-medium leading-relaxed font-sans uppercase tracking-wide text-[11px]">
                  {activeProofTask.description}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Deadline requirements: {formatDateTime(activeProofTask.deadline)}</span>
                </div>
              </div>

              {/* Image Upload box (Includes file selection or drag and drop) */}
              {!previewImage ? (
                <div className="space-y-4">
                  {/* Integrity Framing Header / Subtitle */}
                  <div className="text-center p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <p className="text-xs text-emerald-400 font-semibold tracking-wide flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      "Every verified day is a photo you actually took."
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Proof of intent builds lasting confidence. Choose live capture for maximum accountability.
                    </p>
                  </div>

                  {/* Mode Toggles */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMethod("live");
                        startCamera();
                      }}
                      className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        uploadMethod === "live"
                          ? "bg-emerald-500 text-black shadow-lg"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Live Capture (High Trust)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMethod("upload");
                        stopCamera();
                      }}
                      className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        uploadMethod === "upload"
                          ? "bg-zinc-800 text-zinc-100 shadow-lg"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload File (Lower Trust)
                    </button>
                  </div>

                  {uploadMethod === "live" ? (
                    <div className="relative border border-zinc-800 bg-black rounded-2xl overflow-hidden aspect-video w-full flex flex-col items-center justify-center group shadow-xl">
                      {isCameraActive ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          {/* Live Overlay HUD */}
                          <div className="absolute inset-4 pointer-events-none border border-emerald-500/20 rounded-lg">
                            <div className="absolute top-2 left-2 bg-emerald-500/20 backdrop-blur-md text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                              ● LIVE FEED
                            </div>
                            {/* Target Brackets */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-emerald-400/40 border-dashed rounded-full" />
                          </div>
                          {/* Capture Shutter Button */}
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="bg-emerald-400 text-black hover:bg-emerald-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              Capture Live Proof
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-6 text-center space-y-4">
                          <p className="text-sm text-zinc-400 font-mono">
                            {cameraError || "Initializing live viewfinder..."}
                          </p>
                          {cameraError && (
                            <button
                              type="button"
                              onClick={startCamera}
                              className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700 px-4 py-1.5 rounded-xl text-xs font-mono cursor-pointer"
                            >
                              Retry Camera
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        isDragActive 
                          ? 'border-emerald-400 bg-zinc-950 scale-[0.99] shadow-inner' 
                          : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-emerald-400/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xs text-emerald-400">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">Upload screenshot or snapshot proof</p>
                          <p className="text-xs text-zinc-400 mt-1">Drag and drop file here, or click to browse files</p>
                        </div>
                        <span className="text-[10px] max-w-xs text-zinc-500 mt-2 leading-snug font-mono">
                          Submit code screenshot, terminal window output, emails, or receipt visual confirmation.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Display Image once uploaded / previewing */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video max-h-[220px] flex items-center justify-center">
                    <img 
                      src={previewImage || ""} 
                      alt="Proof Submission preview" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                    
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        setVerificationResult(null);
                        // If in live mode, automatically restart camera
                        if (uploadMethod === "live") {
                          startCamera();
                        }
                      }}
                      className="absolute right-3 top-3 bg-black/70 text-zinc-100 hover:brightness-110 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm flex items-center gap-1 border border-zinc-800 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake / Replace
                    </button>
                  </div>

                  <div className="pt-2 text-center text-xs text-zinc-400 font-mono">
                    Press <span className="text-emerald-400 font-bold">Evaluate Proof Verification</span> to run AI checks.
                  </div>
                </div>
              )}

              {/* Footer buttons of the modal */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-2 text-xs">
                <button
                  onClick={closeProofModal}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close View
                </button>

                {previewImage && (
                  <button
                    onClick={handleVerifySubmission}
                    className="px-4 py-2.5 font-bold text-black bg-emerald-400 hover:brightness-110 rounded-xl cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] border border-emerald-400/20 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Evaluate Proof Verification
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* ================= STEPS 1-5: FULL-SCREEN CINEMATIC CEREMONY ================= */
            <div className="fixed inset-0 z-50 bg-black overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
              
              {/* Cinematic Vignetted Background Photo */}
              <div className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none pointer-events-none">
                <img 
                  src={previewImage || ""} 
                  alt="Cinematic Background Proof" 
                  className="w-full h-full object-cover opacity-35 filter blur-[1px]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.15)_20%,rgba(9,9,11,0.92)_85%,rgba(9,9,11,1)_100%)]" />
              </div>

              {/* Camera targeting green HUD Brackets (Pulsing gently) */}
              <div className="absolute inset-4 md:inset-12 pointer-events-none animate-[pulseHud_3s_infinite]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400/75 rounded-tl-md" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400/75 rounded-tr-md" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400/75 rounded-bl-md" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400/75 rounded-br-md" />
              </div>

              {/* Green Scanning line sweeping across screen */}
              {ceremonyStep <= 4 && (
                <div 
                  className="absolute left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.8),0_0_30px_rgba(16,185,129,0.4)] pointer-events-none"
                  style={{
                    animation: "scanSweep 5s ease-in-out infinite"
                  }}
                />
              )}

              {/* Close View / Dismiss button on the very top left/right corner */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={closeProofModal}
                  disabled={ceremonyStep < 5 && isVerifying}
                  className="px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-xs disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4 text-zinc-500" />
                  [ CLOSE VIEW ]
                </button>
              </div>

              {/* Central Content Panel container */}
              <div className="relative w-full max-w-xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header title inside panel */}
                <div className="border-b border-zinc-800/80 pb-4">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-mono">
                    Accountability Verifier AI v3.5
                  </span>
                  <h3 className="text-lg font-bold text-zinc-100 font-display">
                    {activeProofTask.title}
                  </h3>
                </div>

                {/* STEP 1: LOADING STATE WITH SCANNERS RUNNING */}
                {ceremonyStep === 1 && (
                  <div className="py-12 flex flex-col items-center justify-center gap-6 text-center">
                    
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-400/20 border-t-emerald-400 animate-spin" />
                      <div className="absolute">
                        <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-bold text-emerald-400 font-mono tracking-widest animate-pulse">
                        Analyzing evidence…
                      </p>
                      <p className="text-xs text-zinc-400 font-mono max-w-xs mx-auto">
                        {isRetrying ? "The verifier is busy — retrying..." : "Scanning screenshot pixels contextually..."}
                      </p>
                    </div>

                    {/* Gemini rate limit / key configuration or network errors */}
                    {verificationError && (
                      <div className="mt-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-center max-w-sm mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                          {verificationError}
                        </p>
                        <div className="flex justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(null);
                              setVerificationResult(null);
                              setVerificationError(null);
                              setCeremonyStep(0);
                            }}
                            className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifySubmission}
                            className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Try again
                          </button>
                        </div>
                      </div>
                    )}

                    {!verificationError && (
                      <p className="text-[10px] text-zinc-500 font-sans max-w-sm pt-4 border-t border-zinc-900/50 leading-snug">
                        Comparing submission against task constraints and deadline.
                      </p>
                    )}

                  </div>
                )}

                {/* STEPS 2-5: TERMINAL TRACE STREAMS */}
                {ceremonyStep >= 2 && (
                  <div className="flex flex-col gap-5">
                    
                    {/* Monospace terminal logs */}
                    <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl font-mono text-[11px] space-y-2.5 text-emerald-400/80 shadow-inner">
                      
                      {/* Trace Step 1 */}
                      <div className="flex justify-between">
                        <span>&gt; Reading your evidence...</span>
                        <span className="font-bold text-emerald-400">
                          {ceremonyStep > 2 ? "[ OK ]" : "[ PARSING... ]"}
                        </span>
                      </div>

                      {/* Trace Step 2 */}
                      {ceremonyStep >= 3 && (
                        <div className="flex justify-between border-t border-zinc-900 pt-2 animate-in fade-in duration-300">
                          <span className="truncate max-w-[80%]">
                            &gt; Matching evidence to task: &quot;{activeProofTask.title}&quot;...
                          </span>
                          <span className="font-bold text-emerald-400">
                            {ceremonyStep > 3 ? "[ OK ]" : "[ MATCHING... ]"}
                          </span>
                        </div>
                      )}

                      {/* Trace Step 3 */}
                      {ceremonyStep >= 4 && (
                        <div className="flex justify-between border-t border-zinc-900 pt-2 animate-in fade-in duration-300">
                          <span>
                            &gt; Performing duplicate & blanks visual pattern scan...
                          </span>
                          <span className="font-bold text-emerald-400">
                            {ceremonyStep > 4 ? "[ OK ]" : "[ ANALYZING... ]"}
                          </span>
                        </div>
                      )}

                      {/* Resolve and display plain-English verdict details and annotated evidence */}
                      {ceremonyStep >= 5 && verificationResult && (
                        <div className="space-y-4 mt-4 animate-in fade-in duration-300">
                          
                          {/* 1. ANNOTATED EVIDENCE PANEL */}
                          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video w-full flex items-center justify-center group shadow-xl">
                            <img 
                              src={previewImage || ""} 
                              alt="Annotated Evidence Proof" 
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {/* Glowing green bracket/box over that region of the proof image */}
                            {verificationResult.evidenceRegion && 
                             typeof verificationResult.evidenceRegion.x === 'number' &&
                             typeof verificationResult.evidenceRegion.y === 'number' &&
                             typeof verificationResult.evidenceRegion.width === 'number' &&
                             typeof verificationResult.evidenceRegion.height === 'number' &&
                             verificationResult.evidenceRegion.width > 0 && 
                             verificationResult.evidenceRegion.height > 0 && (
                              <div
                                className="absolute border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.7)] rounded animate-pulse"
                                style={{
                                  left: `${verificationResult.evidenceRegion.x * 100}%`,
                                  top: `${verificationResult.evidenceRegion.y * 100}%`,
                                  width: `${verificationResult.evidenceRegion.width * 100}%`,
                                  height: `${verificationResult.evidenceRegion.height * 100}%`,
                                }}
                              >
                                {/* Corner Brackets */}
                                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-300" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-300" />
                                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-300" />
                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-300" />
                                
                                {/* Label Tag */}
                                <div className="absolute -top-6 left-0 bg-emerald-500 text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                                  {verificationResult.evidenceRegion.evidenceLabel || "key evidence"}
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                              {uploadMethod === "live" || (activeProofTask && activeProofTask.uploadMethod === "live") ? (
                                <div className="bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Live capture (High Trust)
                                </div>
                              ) : (
                                <div className="bg-zinc-850/90 border border-zinc-800 text-[9px] font-mono text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1">
                                  Uploaded (lower trust)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. COURTROOM VERDICT PANEL */}
                          {(() => {
                            const isVerified = verificationResult.verified;
                            const isBorderline = !isVerified && verificationResult.confidence < 0.85;
                            
                            let colorClass = "";
                            let borderClass = "";
                            let bgClass = "";
                            let statusLabel = "";
                            
                            if (isVerified) {
                              colorClass = "text-[#00E676]";
                              borderClass = "border-[#00E676]/30";
                              bgClass = "bg-[#00E676]/5";
                              statusLabel = "APPROVED";
                            } else if (isBorderline) {
                              colorClass = "text-amber-500";
                              borderClass = "border-amber-500/30";
                              bgClass = "bg-amber-500/5";
                              statusLabel = "BORDERLINE / NEEDS LOOK";
                            } else {
                              colorClass = "text-rose-500";
                              borderClass = "border-rose-500/30";
                              bgClass = "bg-rose-500/5";
                              statusLabel = "REJECTED";
                            }

                            const confidenceLabel = getConfidenceLabel(verificationResult.confidence);

                            return (
                              <div className={`p-4 border ${borderClass} ${bgClass} rounded-2xl space-y-3`}>
                                {/* Panel Header */}
                                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                                  <span className="font-mono text-xs font-bold tracking-widest text-zinc-400">
                                    VERDICT
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono text-xs font-black tracking-wider uppercase ${colorClass}`}>
                                      [{statusLabel}]
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                                      {confidenceLabel} CONFIDENCE
                                    </span>
                                  </div>
                                </div>

                                {/* Authenticity Alert if not clean */}
                                {verificationResult.authenticityFlag && verificationResult.authenticityFlag !== "clean" && (
                                  <div className="flex items-start gap-2.5 p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-left">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-rose-200 leading-normal">
                                      <p className="font-bold text-rose-400 uppercase tracking-wider text-[9px] font-mono">
                                        AUTHENTICITY FLAG: {verificationResult.authenticityFlag.toUpperCase().replace("_", " ")}
                                      </p>
                                      <p className="mt-0.5 font-sans">
                                        {verificationResult.authenticityFlag === "blank" && "The verifier detected a blank or empty image submission."}
                                        {verificationResult.authenticityFlag === "unrelated" && "The image content does not correspond to this specific committed task."}
                                        {verificationResult.authenticityFlag === "looks_generated" && "This image shows patterns resembling synthetic or stock generator templates."}
                                        {verificationResult.authenticityFlag === "looks_duplicated" && "This exact image has been used in prior verification submissions."}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Reasoning Display */}
                                <div className="font-mono text-xs text-zinc-300 leading-relaxed space-y-2">
                                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                    Verifier Reasoning:
                                  </p>
                                  <p className="italic text-zinc-200">
                                    &quot;{verificationResult.verdictReason || 
                                            (isVerified ? verificationResult.matchedEvidence : verificationResult.mismatchReason)}&quot;
                                  </p>
                                </div>

                                {/* Integrity Footnote */}
                                <div className="text-[10px] text-zinc-500 text-center pt-2 border-t border-zinc-800/40 font-mono">
                                  "Every verified day is a photo you actually took."
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      )}

                    </div>

                    {/* CONFIDENCE GAUGE + VERDICT STAMP ROW */}
                    {ceremonyStep === 5 && verificationResult && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        
                        {/* Gauge widget */}
                        <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                            AI CONFIDENCE METER
                          </span>
                          
                          <div className="relative w-36 h-20 overflow-hidden flex items-end justify-center">
                            {/* SVG Arc Path */}
                            <svg className="w-36 h-36 absolute -bottom-16" viewBox="0 0 100 100">
                              <path 
                                d="M 15 50 A 35 35 0 0 1 85 50" 
                                fill="none" 
                                stroke="#27272a" 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                              />
                              {/* Low Arc (Red) */}
                              <path 
                                d="M 15 50 A 35 35 0 0 1 38 25" 
                                fill="none" 
                                stroke="#f43f5e" 
                                strokeWidth="8" 
                                opacity="0.35"
                              />
                              {/* Medium Arc (Amber) */}
                              <path 
                                d="M 38 25 A 35 35 0 0 1 62 25" 
                                fill="none" 
                                stroke="#f59e0b" 
                                strokeWidth="8" 
                                opacity="0.35"
                              />
                              {/* High Arc (Green) */}
                              <path 
                                d="M 62 25 A 35 35 0 0 1 85 50" 
                                fill="none" 
                                stroke="#10b981" 
                                strokeWidth="8" 
                                opacity="0.35"
                              />
                            </svg>
                            
                            {/* Needle rotating from -90deg (Low) to 90deg (High) */}
                            <div 
                              className="absolute bottom-0 w-1.5 h-14 bg-emerald-400 origin-bottom rounded-t-full transition-transform duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                              style={{
                                transform: `rotate(${isAnimatingGauge ? getConfidenceAngle(verificationResult.confidence) - 90 : -90}deg)`
                              }}
                            />
                            <div className="absolute bottom-0 w-4.5 h-4.5 bg-zinc-950 border-2 border-emerald-400 rounded-full" />
                          </div>

                          <div className="text-sm font-mono font-bold mt-2 text-emerald-400 tracking-widest uppercase">
                            {isAnimatingGauge ? getConfidenceLabel(verificationResult.confidence) : "---"}
                          </div>
                        </div>

                        {/* Stamp panel */}
                        <div className="relative min-h-[120px] flex items-center justify-center">
                          {stampSlammed && (
                            <div className="w-full flex flex-col items-center gap-2">
                              {verificationResult.verified ? (
                                /* APPROVED STAMP */
                                <>
                                  <ConfettiBurst />
                                  <div className="border-4 border-dashed border-emerald-400 text-emerald-400 font-display text-2xl md:text-3xl font-extrabold uppercase px-4 py-2.5 rounded-xl text-center shadow-[0_0_25px_rgba(16,185,129,0.2)] animate-[stampSlam_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                                    VERIFIED / LOCKED
                                  </div>
                                  
                                  {/* Streak celebration inside modal */}
                                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold uppercase mt-2 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/20 animate-[streakPulse_2.5s_infinite]">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    STREAK SAVED: {stats.streak} DAYS ACTIVE!
                                  </div>
                                </>
                              ) : verificationResult.confidence < 0.85 ? (
                                /* BORDERLINE STAMP */
                                <div className="border-4 border-dashed border-amber-400 text-amber-400 font-display text-2xl md:text-3xl font-extrabold uppercase px-4 py-2.5 rounded-xl text-center shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-[stampSlam_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                                  NEEDS LOOK
                                </div>
                              ) : (
                                /* REJECTED STAMP */
                                <div className="border-4 border-dashed border-rose-500 text-rose-400 font-display text-2xl md:text-3xl font-extrabold uppercase px-4 py-2.5 rounded-xl text-center shadow-[0_0_25px_rgba(244,63,94,0.2)] animate-[stampSlam_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                                  REJECTED
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* Follow up question details if rejected borderline */}
                    {ceremonyStep === 5 && verificationResult && !verificationResult.verified && verificationResult.followUpQuestion && (
                      <div className="bg-zinc-900 border border-zinc-800/80 p-3 rounded-xl animate-in slide-in-from-top-2 duration-300">
                        <p className="font-bold text-amber-400 text-xs font-mono uppercase mb-1">Awaiting details:</p>
                        <p className="text-[11px] text-zinc-300 font-mono italic">{verificationResult.followUpQuestion}</p>
                      </div>
                    )}

                     {/* ACTION BUTTONS AT THE FOOTER OF PANEL */}
                    {ceremonyStep === 5 && (
                      <div className="border-t border-zinc-800/80 pt-4 mt-2 flex flex-col sm:flex-row justify-end items-center gap-3 text-xs w-full">
                        
                        {/* Left/Start side: Escape hatches (Retake is always available) */}
                        <div className="flex flex-wrap gap-2 mr-auto w-full sm:w-auto justify-center sm:justify-start">
                          {/* Retake Button */}
                          <button
                            onClick={() => {
                              setPreviewImage(null);
                              setVerificationResult(null);
                              setVerificationError(null);
                              setCeremonyStep(0);
                            }}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                            Retake
                          </button>
                        </div>

                        {/* Right side: standard Close View */}
                        <button
                          onClick={closeProofModal}
                          className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl transition-all cursor-pointer text-center"
                        >
                          Close View
                        </button>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* 7) EVENING VERIFICATION RECKONING MODAL */}
      {isReckoningActive && (
        <div id="reckoning-modal" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative bg-zinc-950 border border-zinc-805 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8">
            
            {/* Header: Cosmic Ritual Vibe */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-xl text-purple-400">
                  <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-zinc-100 flex items-center gap-2">
                    🌌 Verification Reckoning
                  </h2>
                  <p className="text-xs text-zinc-400">The daily bookend ritual of accountability</p>
                </div>
              </div>
              <button
                onClick={() => setIsReckoningActive(false)}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content Switcher based on step */}
            {reckoningStep === "intro" && (
              <div className="space-y-6 text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="max-w-md mx-auto space-y-3">
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    At the end of each day, StayOnTrack reviews your commitments.
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Any unproven commitments will trigger <span className="text-rose-400 font-bold font-semibold">autonomous agent recovery protocols</span>. The AI will raise urgency levels, re-plan your agenda for tomorrow, and draft emails or messages for you.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
                  <button
                    onClick={runReckoningTally}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    Begin Reckoning Tally
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsReckoningActive(false)}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {reckoningStep === "counting" && (
              <div className="space-y-8 py-8 animate-in fade-in duration-200">
                <div className="text-center">
                  <p className="text-xs uppercase font-bold tracking-widest text-purple-400 font-mono animate-pulse">Running Forensic Audit</p>
                  <h3 className="text-sm text-zinc-400 mt-1">Scanning proof database...</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-1">
                    <span className="text-[#00E676] font-mono text-3xl font-black block">
                      {currentProvenCount}
                    </span>
                    <span className="text-zinc-400 text-xs font-bold tracking-wider uppercase">PROVEN</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-1">
                    <span className="text-rose-500 font-mono text-3xl font-black block">
                      {currentUnprovenCount}
                    </span>
                    <span className="text-zinc-400 text-xs font-bold tracking-wider uppercase">UNPROVEN</span>
                  </div>
                </div>

                {/* Animated Scanner Progress Bar */}
                <div className="w-full max-w-md mx-auto h-1.5 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800">
                  <div className="h-full bg-purple-500 absolute left-0 top-0 w-3/4 animate-pulse rounded-full" />
                </div>
              </div>
            )}

            {reckoningStep === "resolving" && (
              <div className="space-y-6 py-6 text-center animate-in zoom-in-95 duration-300">
                {reckoningOutcome === "pass" ? (
                  <div className="space-y-4">
                    <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-bounce">
                      <Flame className="w-12 h-12 text-amber-300" style={{ animation: "streakPulse 1.5s infinite" }} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-emerald-400 font-display uppercase tracking-tight">STREAK UNBROKEN!</h3>
                      <p className="text-zinc-300 text-sm max-w-md mx-auto">
                        Amazing. You proved all daily commitments today. Your streak increments with pride!
                      </p>
                    </div>

                    <div className="pt-6 max-w-sm mx-auto">
                      <button
                        onClick={() => {
                          setIsReckoningActive(false);
                          setReckoningStep("intro");
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-brand-bg font-bold text-sm rounded-xl transition-all cursor-pointer"
                      >
                        Fantastic! Continue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                      <XCircle className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-rose-500 font-display uppercase tracking-tight">STREAK BROKEN</h3>
                      <p className="text-zinc-300 text-sm max-w-md mx-auto">
                        Your streak has reset, and unproven commitments are being flagged. But this is not a punishment — it's an honest audit.
                      </p>
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-left max-w-md mx-auto space-y-1 mt-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Streak Status:</span>
                          <span className="text-rose-400 font-mono font-bold">RESET TO 0</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Unproven commitments:</span>
                          <span className="text-rose-400 font-mono font-bold">{reckoningUnproven.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 max-w-sm mx-auto">
                      <button
                        onClick={runAutonomousReckonEscalation}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        Engage Autonomous Recovery
                        <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reckoningStep === "escalating" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center">
                  <div className="inline-block p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 animate-pulse">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 mt-2">StayOnTrack Autonomous Agent Escalating...</h3>
                  <p className="text-xs text-zinc-500 font-semibold">Contacting Gemini Model & crafting recovery options</p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-[11px]">
                  {reckoningEscalationLines.map((line, idx) => {
                    const isCurrent = escalatingIndex === idx;
                    return (
                      <div key={idx} className={`p-2.5 rounded-lg border ${
                        isCurrent 
                          ? 'border-rose-500/30 bg-rose-950/20 text-rose-300 animate-pulse' 
                          : line.status === 'done' 
                          ? 'border-[#00E676]/20 bg-[#00E676]/5 text-[#00E676]/80' 
                          : 'border-zinc-800 text-zinc-500'
                      } flex items-start gap-2.5 justify-between`}>
                        <div className="space-y-1 bg-transparent">
                          <p className="font-bold">Unproven: &quot;{line.taskTitle}&quot;</p>
                          <p className="text-[10px] opacity-80">
                            {isCurrent 
                              ? "→ Raising urgency, re-planning agenda, drafting communications..." 
                              : line.status === 'done' 
                              ? "→ Urgency raised. Re-planned for tomorrow. Copyable communications drafted." 
                              : "→ Pending queue..."}
                          </p>
                        </div>
                        <div className="shrink-0 font-bold uppercase tracking-wider text-[10px]">
                          {isCurrent ? (
                            <span className="text-rose-400 animate-pulse">[Active...]</span>
                          ) : line.status === 'done' ? (
                            <span className="text-[#00E676]">[Escalated]</span>
                          ) : (
                            <span className="text-zinc-600">[Queued]</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative">
                  <div className="h-full bg-rose-500 absolute left-0 top-0 w-full animate-pulse" />
                </div>
              </div>
            )}

            {reckoningStep === "complete" && (
              <div className="space-y-6 py-6 text-center animate-in zoom-in-95 duration-200">
                <div className="inline-flex p-4 bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 rounded-full">
                  <CheckCheck className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-100 font-display uppercase">Reckoning Finalized</h3>
                  <p className="text-zinc-300 text-xs max-w-sm mx-auto leading-relaxed">
                    Forensic audit complete. Unproven commitments have been logged, and their autonomous recovery plans are now active on your board cards.
                  </p>
                </div>

                <div className="pt-6 max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      setIsReckoningActive(false);
                      setReckoningStep("intro");
                    }}
                    className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Return to Action Board
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
