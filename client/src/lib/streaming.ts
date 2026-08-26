export type StreamChunk =
  | { type: "start"; module: string }
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: string }
  | { type: "done"; content: string }
  | { type: "error"; message: string };

export type StreamCallbacks = {
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: string) => void;
  onDone?: (content: string) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
};

export function streamAssistant(
  module: string,
  message: string,
  callbacks: StreamCallbacks,
  context?: string,
  role?: string
): () => void {
  const params = new URLSearchParams({ module, message });
  if (context) params.set("context", context);
  if (role) params.set("role", role);

  const controller = new AbortController();

  fetch(`/api/assistant/stream?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.text();
        callbacks.onError?.(`Erro ${response.status}: ${error}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.("ReadableStream não suportado.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const chunk: StreamChunk = JSON.parse(data);
            switch (chunk.type) {
              case "start":
                callbacks.onStart?.();
                break;
              case "token":
                callbacks.onToken?.(chunk.content);
                break;
              case "tool_call":
                callbacks.onToolCall?.(chunk.name, chunk.args);
                break;
              case "tool_result":
                callbacks.onToolResult?.(chunk.name, chunk.result);
                break;
              case "done":
                callbacks.onDone?.(chunk.content);
                break;
              case "error":
                callbacks.onError?.(chunk.message);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        callbacks.onError?.(error.message || "Erro de conexão.");
      }
    });

  return () => controller.abort();
}
