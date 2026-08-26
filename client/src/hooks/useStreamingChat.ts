import { useState, useCallback, useRef } from "react";
import {
  streamAssistant as streamAssistantClient,
  StreamCallbacks,
} from "@/lib/streaming";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; result: string; type?: string }>;
};

export type ToolActivity = {
  type: "tool_call" | "tool_result";
  name: string;
  detail?: string;
  result?: string;
};

type StreamState = {
  content: string;
  toolActivities: ToolActivity[];
};

export function useStreamingChat(
  module: string,
  context?: string,
  role?: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolActivity, setCurrentToolActivity] =
    useState<ToolActivity | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamStateRef = useRef<StreamState>({
    content: "",
    toolActivities: [],
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (isStreaming || !content.trim()) return;

      const userMessage: ChatMessage = { role: "user", content: content.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setCurrentToolActivity(null);
      streamStateRef.current = { content: "", toolActivities: [] };

      const callbacks: StreamCallbacks = {
        onStart: () => {},
        onToken: (token) => {
          streamStateRef.current.content += token;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: streamStateRef.current.content,
              };
            } else {
              updated.push({
                role: "assistant",
                content: streamStateRef.current.content,
              });
            }
            return updated;
          });
        },
        onToolCall: (name, _args) => {
          const activity: ToolActivity = {
            type: "tool_call",
            name,
            detail: `Consultando ${name}...`,
          };
          setCurrentToolActivity(activity);
          streamStateRef.current.toolActivities.push(activity);
        },
        onToolResult: (name, result) => {
          const activity: ToolActivity = {
            type: "tool_result",
            name,
            detail: result.slice(0, 200),
            result,
          };
          setCurrentToolActivity(activity);
          streamStateRef.current.toolActivities.push(activity);
        },
        onDone: (finalContent) => {
          setIsStreaming(false);
          setCurrentToolActivity(null);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: finalContent || streamStateRef.current.content,
                toolCalls: streamStateRef.current.toolActivities
                  .filter((a) => a.type === "tool_result")
                  .map((a) => ({ name: a.name, result: a.result || a.detail || "" })),
              };
            }
            return updated;
          });
          streamStateRef.current = { content: "", toolActivities: [] };
        },
        onError: (errorMsg) => {
          setIsStreaming(false);
          setCurrentToolActivity(null);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Erro: ${errorMsg}`,
            },
          ]);
          streamStateRef.current = { content: "", toolActivities: [] };
        },
      };

      abortRef.current = streamAssistantClient(module, content, callbacks, context, role);
    },
    [module, context, isStreaming, role]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.();
    setIsStreaming(false);
    setCurrentToolActivity(null);
    streamStateRef.current = { content: "", toolActivities: [] };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamStateRef.current = { content: "", toolActivities: [] };
  }, []);

  return {
    messages,
    isStreaming,
    currentToolActivity,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}
