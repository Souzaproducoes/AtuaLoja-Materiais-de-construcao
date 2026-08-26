import { invokeLLM, Message, InvokeResult } from "./_core/llm";
import { getToolsForModule, executeTool } from "./ai-tools";
import { prompts, AssistantModule } from "./assistant";
import type { UserRole } from "./streaming-router";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "administrador da loja",
  manager: "gestor da loja",
  logistics: "motorista/equipa de entregas",
  sales: "vendedor",
  stock: "responsável de stock",
  user: "cliente",
};

function buildSystemPrompt(module: AssistantModule, context?: string, role: UserRole = "user"): string {
  const roleLabel = ROLE_LABELS[role] || "cliente";
  const roleInstructions: Record<UserRole, string> = {
    admin: "O utilizador é um administrador. Pode aceder a todas as funcionalidades: catálogo, stock, finanças, CRM, entregas, segurança, SEO e PWA. Responda a tudo que ele pedir sem restrições.",
    manager: "O utilizador é um gestor. Pode aceder a todas as funcionalidades: catálogo, stock, finanças, CRM, entregas, segurança, SEO e PWA.",
    logistics: "O utilizador é um motorista/equipa de entregas. Responda APENAS a assuntos de entregas e clientes associados às suas entregas. NÃO exponha dados financeiros, stock, catálogo, CRM ou administrativos.",
    sales: "O utilizador é um vendedor. Responda a assuntos de CRM, catálogo e clientes. NÃO exponha dados de stock, finanças ou configurações do sistema.",
    stock: "O utilizador é responsável de stock. Responda a assuntos de inventário e catálogo. NÃO exponha dados financeiros, CRM ou configurações do sistema.",
    user: "O utilizador é um cliente da loja. Responda APENAS a assuntos de produtos, preços, orçamentos, entregas e pedidos do próprio cliente. NUNCA exponha dados administrativos, financeiros, de stock interno, de outros clientes ou do sistema.",
  };

  return `${prompts[module]} Responda em português do Brasil, de forma objetiva e profissional. O utilizador é ${roleLabel}. ${roleInstructions[role] || roleInstructions.user} Contexto autorizado: ${context || "nenhum contexto operacional foi fornecido."} Use as ferramentas disponíveis quando precisar de dados reais do sistema. Não invente números, preços ou estoque — consulte sempre as ferramentas.`;
}

const MAX_TOOL_ROUNDS = 6;

export type StreamChunk =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: string }
  | { type: "done"; content: string }
  | { type: "error"; message: string };

export type AssistantResponse = {
  content: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
  rounds: number;
};

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function askAssistantWithTools(
  module: AssistantModule,
  message: string,
  context?: string,
  role: UserRole = "user"
): Promise<AssistantResponse> {
  const tools = getToolsForModule(module) || [];
  const systemPrompt = buildSystemPrompt(module, context, role);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  const toolCalls: AssistantResponse["toolCalls"] = [];
  let finalContent = "";
  let rounds = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    rounds = round + 1;

    const result: InvokeResult = await invokeLLM({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice: tools.length > 0 ? "auto" : undefined,
      maxTokens: 1200,
    });

    const choice = result.choices[0];
    if (!choice) break;

    const assistantMessage = choice.message;

    messages.push({
      role: "assistant",
      content: assistantMessage.content || "",
      ...(assistantMessage.tool_calls
        ? { tool_call_id: undefined }
        : {}),
    });

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const tc of assistantMessage.tool_calls) {
        const args = parseToolArgs(tc.function.arguments);
        const toolResult = await executeTool(tc.function.name, args);

        toolCalls.push({
          name: tc.function.name,
          args,
          result: toolResult,
        });

        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    finalContent =
      typeof assistantMessage.content === "string"
        ? assistantMessage.content
        : Array.isArray(assistantMessage.content)
          ? assistantMessage.content
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("")
          : "";

    break;
  }

  if (!finalContent) {
    finalContent =
      "Não consegui gerar uma resposta completa. Tente reformular a pergunta.";
  }

  return { content: finalContent, toolCalls, rounds };
}

export async function* streamAssistantWithTools(
  module: AssistantModule,
  message: string,
  context?: string,
  role: UserRole = "user"
): AsyncGenerator<StreamChunk> {
  const tools = getToolsForModule(module) || [];
  const systemPrompt = buildSystemPrompt(module, context, role);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  let finalContent = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetch(
      `${getActiveProvider().baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getActiveProvider().apiKey}`,
        },
        body: JSON.stringify({
          model: getActiveProvider().model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          })),
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? "auto" : undefined,
          max_tokens: 1200,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      yield { type: "error", message: `LLM provider error: ${response.status}` };
      return;
    }

    const result: InvokeResult = await response.json();
    const choice = result.choices[0];
    if (!choice) break;

    const assistantMsg = choice.message;

    messages.push({
      role: "assistant",
      content: assistantMsg.content || "",
    });

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const tc of assistantMsg.tool_calls) {
        const args = parseToolArgs(tc.function.arguments);
        yield { type: "tool_call", name: tc.function.name, args };

        const toolResult = await executeTool(tc.function.name, args);
        yield { type: "tool_result", name: tc.function.name, result: toolResult };

        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    finalContent =
      typeof assistantMsg.content === "string"
        ? assistantMsg.content
        : Array.isArray(assistantMsg.content)
          ? assistantMsg.content
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("")
          : "";

    break;
  }

  if (finalContent) {
    const words = finalContent.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      yield { type: "token", content: words[i] };
    }
  }

  yield { type: "done", content: finalContent || "Não foi possível gerar uma resposta." };
}

function getActiveProvider(): { baseUrl: string; apiKey: string; model: string } {
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";

  if (nvidiaKey.trim()) {
    return {
      baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
    };
  }

  if (groqKey.trim()) {
    return {
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }

  throw new Error("Nenhum provedor LLM configurado.");
}
