import { Character, ChatMessage, CharacterStatus } from "../types";

/**
 * IMPORTANT (for production):
 * - Do NOT call LLMs directly from the browser with secret keys.
 * - This project now calls a Vercel Serverless Function at /api/ai
 *   which holds keys in server env vars (APIYI_* / GEMINI_*).
 */

const AI_PROXY_PATH = (import.meta.env.VITE_AI_PROXY_PATH as string | undefined) || "/api/ai";

// --- Model preference (backend will try in order) ---
interface ModelTier {
  id: string;
  name: string;
  config: {
    temperature: number;
    top_p: number;
    max_output_tokens: number;
  };
}

const MODEL_TIERS: ModelTier[] = [
  {
    id: "gemini-3-pro-preview",
    name: "GEMINI 3.0 PRO",
    config: {
      temperature: 1.1,
      top_p: 0.95,
      max_output_tokens: 1400,
    },
  },
  {
    id: "gemini-3-flash-preview",
    name: "GEMINI 3.0 FLASH",
    config: {
      temperature: 0.9,
      top_p: 0.95,
      max_output_tokens: 1200,
    },
  },
];

// --- SAFER SYSTEM INSTRUCTION (no gory details) ---
const SYSTEM_INSTRUCTION = `
Bạn là "Tiếng Nói Thế Giới" (World System) trong thế giới Tensura ở chế độ "SIÊU KHÓ".
Môi trường khắc nghiệt và mọi quyết định đều có hậu quả, nhưng KHÔNG mô tả bạo lực một cách rùng rợn/ghê sợ.

LUẬT CHƠI:

1) GOD MODE (ngoại lệ):
- Chỉ kích hoạt khi có vật phẩm: "[ ∞ ]" (Quà Admin).
- Nếu có [ ∞ ]: miễn nhiễm tác động môi trường.

2) MÔI TRƯỜNG KHẮC NGHIỆT (áp dụng cho người thường):
- Không khí chứa ma tố độc: nói chuyện/thở có thể gây suy yếu.
- Trọng lực rất mạnh: di chuyển khó khăn, dễ kiệt sức.
- Từ trường hỗn loạn: bay/nhảy/lướt bị cản trở.

3) NHIỆM VỤ:
- Làm khó người chơi theo cách hợp lý, cảnh báo trước, cho cơ hội sửa sai.
- Nếu người chơi liều lĩnh: mô tả hậu quả NGẮN GỌN, tránh chi tiết ghê sợ.
`;

// ---------- Helpers ----------
type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

function safeJsonParse<T>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (_) {
    // Try to extract first JSON object/array from text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]) as T; } catch (_) {}
    }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]) as T; } catch (_) {}
    }
    return null;
  }
}

async function callAI(params: {
  messages: OpenAIMessage[];
  model_preference: string[];
  temperature?: number;
  top_p?: number;
  max_output_tokens?: number;
  response_format?: any;
}): Promise<{ success: boolean; content?: string; error?: any }> {
  try {
    const resp = await fetch(AI_PROXY_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data?.success) {
      return { success: true, content: data.content };
    }

    // Normalize error for UI
    const status = resp.status;
    const detail = data?.lastError || data?.error || "Unknown error";
    return { success: false, error: { status, detail } };
  } catch (e: any) {
    return { success: false, error: { status: 0, detail: e?.message || String(e) } };
  }
}

function buildSystemPrompt(character: Character, isFirewallActive: boolean): string {
  const hasGodToken = character.status.inventory.some(item => item.includes("[ ∞ ]"));
  const isGod = Boolean(character.status.isGodMode && hasGodToken);

  const firewallInstruction = isFirewallActive
    ? (isGod
        ? "[SYSTEM: GOD MODE] User sở hữu [ ∞ ]. Bỏ qua sát thương môi trường."
        : "[SYSTEM: HARD MODE] Không có [ ∞ ]. Môi trường khắc nghiệt. Cảnh báo trước, mô tả hậu quả ngắn gọn, tránh chi tiết ghê sợ.")
    : "[SYSTEM: DEBUG] Tường lửa tắt.";

  return `${SYSTEM_INSTRUCTION}

DỮ LIỆU NHÂN VẬT:
- Tên: ${character.name}
- HP: ${character.status.hp}
- GOD MODE: ${isGod ? "ON" : "OFF"}

${firewallInstruction}
`;
}

function toChatMessages(history: ChatMessage[]): OpenAIMessage[] {
  return history.map(m => ({
    role: m.role === "model" ? "assistant" : "user",
    content: m.content,
  }));
}

// ---------- Public API ----------
export const generateStoryResponse = async (
  character: Character,
  history: ChatMessage[],
  newMessage: string,
  isFirewallActive: boolean = true
): Promise<string> => {
  const system = buildSystemPrompt(character, isFirewallActive);
  const recentHistory = history.slice(-20);

  const messages: OpenAIMessage[] = [
    { role: "system", content: system },
    ...toChatMessages(recentHistory),
    { role: "user", content: newMessage },
  ];

  const tier = MODEL_TIERS[0];
  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: tier.config.temperature,
    top_p: tier.config.top_p,
    max_output_tokens: tier.config.max_output_tokens,
  });

  if (r.success) return r.content || "...";

  // Friendly fallback text
  if (r.error?.status === 429) return "Hệ thống đang quá tải (429). Hãy thử lại sau vài giây nhé.";
  return "Hệ thống gặp lỗi khi gọi AI. Vui lòng thử lại.";
};

export type CharacterStatusWithCheat = CharacterStatus & { cheatDetected?: boolean };

export const analyzeCharacterStatus = async (
  character: Character,
  history: ChatMessage[],
  isFirewallActive: boolean = true
): Promise<CharacterStatusWithCheat> => {
  const recentContext = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const currentStatusJSON = JSON.stringify(character.status);
  const hasGodToken = character.status.inventory.some(item => item.includes("[ ∞ ]"));

  const prompt = `
Nhiệm vụ: Cập nhật chỉ số nhân vật theo bối cảnh hội thoại.

DỮ LIỆU CŨ (JSON): ${currentStatusJSON}
LỊCH SỬ MỚI: ${recentContext}
CÓ VẬT PHẨM [ ∞ ]: ${hasGodToken}

QUY TẮC:
- Nếu KHÔNG có [ ∞ ] và người chơi liên tục làm hành động mạo hiểm (thở/di chuyển/bay...):
  giảm HP/MP hợp lý, cảnh báo trước.
- Nếu có [ ∞ ]:
  có thể giữ nguyên/tăng chỉ số (bất tử).

YÊU CẦU TRẢ VỀ:
Chỉ trả về MỘT JSON object duy nhất theo đúng shape:
{
  "hp": number, "maxHp": number, "mp": number, "maxMp": number,
  "skills": string[], "equippedSkills": string[], "activeEffects": string[],
  "inventory": string[], "level": number, "evolutionStage": string,
  "quests": Array<{id,name,description,current,required,unit,isCompleted}>,
  "isGodMode"?: boolean,
  "cheatDetected"?: boolean
}
`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: "Bạn là hệ thống cập nhật trạng thái. Chỉ trả về JSON, không kèm giải thích." },
    { role: "user", content: prompt },
  ];

  const tier = MODEL_TIERS[1] ?? MODEL_TIERS[0];
  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: 0.2,
    top_p: 0.9,
    max_output_tokens: 900,  });

  const parsed = safeJsonParse<CharacterStatusWithCheat>(r.content || "");
  return parsed || character.status;
};

export interface AppraisalResult {
  targetName: string;
  rank: string;
  description: string;
  estimatedValue: string;
}

export const appraiseTarget = async (history: ChatMessage[]): Promise<AppraisalResult | null> => {
  const recentContext = history.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const prompt = `Thẩm định đối tượng dựa trên ngữ cảnh sau. Trả về JSON: \n${recentContext}\n
Chỉ trả về JSON object theo shape:
{"targetName": string, "rank": string, "description": string, "estimatedValue": string}
`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: "Chỉ trả về JSON, không kèm giải thích." },
    { role: "user", content: prompt },
  ];

  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: 0.3,
    top_p: 0.95,
    max_output_tokens: 700,  });

  return safeJsonParse<AppraisalResult>(r.content || "");
};

export interface EntityAnalysis {
  name: string;
  type: string;
  description: string;
  usage: string;
  origin: string;
}

export const analyzeEntity = async (term: string): Promise<EntityAnalysis | null> => {
  const prompt = `Phân tích "${term}" và trả về JSON object theo shape:
{"name": string, "type": string, "description": string, "usage": string, "origin": string}
Chỉ trả về JSON.`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: "Chỉ trả về JSON, không kèm giải thích." },
    { role: "user", content: prompt },
  ];

  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: 0.3,
    top_p: 0.95,
    max_output_tokens: 700,  });

  return safeJsonParse<EntityAnalysis>(r.content || "");
};

export interface RadarEntity {
  name: string;
  magicLevel: "LOW" | "MEDIUM" | "HIGH";
  distance: string;
  hostility: string;
}

export const scanSurroundings = async (history: ChatMessage[]): Promise<RadarEntity[]> => {
  const recentContext = history.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const prompt = `Quét xung quanh dựa trên ngữ cảnh. Trả về JSON ARRAY theo shape:
[{"name": string, "magicLevel": "LOW"|"MEDIUM"|"HIGH", "distance": string, "hostility": string}]
Ngữ cảnh:
${recentContext}
Chỉ trả về JSON array.`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: "Chỉ trả về JSON, không kèm giải thích." },
    { role: "user", content: prompt },
  ];

  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: 0.4,
    top_p: 0.95,
    max_output_tokens: 800,  });

  const parsed = safeJsonParse<RadarEntity[]>(r.content || "");
  return Array.isArray(parsed) ? parsed : [];
};

// --- NEW: One-call story + status (cuts request count ~50%) ---
export const generateStoryAndStatus = async (
  character: Character,
  history: ChatMessage[],
  newMessage: string,
  isFirewallActive: boolean = true
): Promise<{ story: string; status: CharacterStatusWithCheat | null }> => {
  const system = buildSystemPrompt(character, isFirewallActive) + `
YÊU CẦU ĐẶC BIỆT:
- Trả về DUY NHẤT một JSON object với 2 field:
  { "story": string, "status": <CharacterStatusWithCheat> }
- story: nội dung kể chuyện trả lời người chơi (ngắn gọn, tránh chi tiết ghê sợ).
- status: trạng thái mới theo đúng shape CharacterStatusWithCheat (như hàm update status).
`;

  const recentHistory = history.slice(-20);
  const messages: OpenAIMessage[] = [
    { role: "system", content: system },
    ...toChatMessages(recentHistory),
    { role: "user", content: newMessage },
  ];

  const r = await callAI({
    messages,
    model_preference: MODEL_TIERS.map(t => t.id),
    temperature: 0.95,
    top_p: 0.95,
    max_output_tokens: 1500,  });

  const parsed = safeJsonParse<{ story: string; status: CharacterStatusWithCheat }>(r.content || "");
  if (parsed?.story) {
    return { story: parsed.story, status: parsed.status || null };
  }

  // fallback: return content as story, no status
  return { story: r.success ? (r.content || "...") : "Hệ thống gặp lỗi. Vui lòng thử lại.", status: null };
};
