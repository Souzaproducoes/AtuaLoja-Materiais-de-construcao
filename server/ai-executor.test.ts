import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  streamAssistantWithTools,
  StreamChunk,
} from "./ai-executor";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./ai-tools", () => ({
  getToolsForModule: vi.fn().mockReturnValue([]),
  executeTool: vi.fn(),
}));

vi.mock("./assistant", () => ({
  prompts: {
    customer: "Prompt de teste",
    admin: "Prompt admin",
  },
}));

import { invokeLLM } from "./_core/llm";

function makeFetchResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("ai-executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.NVIDIA_API_KEY = "test-key";
    process.env.NVIDIA_BASE_URL = "https://test.api.com/v1";
    process.env.NVIDIA_MODEL = "test-model";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_BASE_URL;
    delete process.env.NVIDIA_MODEL;
  });

  describe("streamAssistantWithTools", () => {
    it("yields token chunks for simple response", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: "Olá! Como posso ajudar?" }, finish_reason: "stop" }],
        })
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of streamAssistantWithTools("admin", "Olá")) {
        chunks.push(chunk);
      }

      const tokenChunks = chunks.filter((c) => c.type === "token");
      const doneChunk = chunks.find((c) => c.type === "done");
      expect(tokenChunks.length).toBeGreaterThan(0);
      expect(doneChunk).toBeDefined();
      expect(doneChunk!.type).toBe("done");
    });

    it("executes tool calls and continues", async () => {
      const mockFetch = vi.mocked(fetch);
      const { executeTool } = await import("./ai-tools");
      vi.mocked(executeTool).mockResolvedValue("Cimento: R$ 35,90/sc");

      mockFetch
        .mockResolvedValueOnce(
          makeFetchResponse({
            choices: [
              {
                message: {
                  content: "",
                  tool_calls: [
                    {
                      id: "call_1",
                      type: "function",
                      function: { name: "search_products", arguments: '{"query":"cimento"}' },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          })
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            choices: [
              {
                message: { content: "O cimento CP II custa R$ 35,90 por saco." },
                finish_reason: "stop",
              },
            ],
          })
        );

      const chunks: StreamChunk[] = [];
      for await (const chunk of streamAssistantWithTools("admin", "Quanto custa cimento?")) {
        chunks.push(chunk);
      }

      const toolCallChunk = chunks.find((c) => c.type === "tool_call");
      const toolResultChunk = chunks.find((c) => c.type === "tool_result");
      const doneChunk = chunks.find((c) => c.type === "done");

      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk!.name).toBe("search_products");
      expect(toolResultChunk).toBeDefined();
      expect(toolResultChunk!.result).toContain("Cimento");
      expect(doneChunk).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("yields error chunk on fetch failure", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({}),
        text: () => Promise.resolve("error"),
      } as any);

      const chunks: StreamChunk[] = [];
      for await (const chunk of streamAssistantWithTools("admin", "Test")) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find((c) => c.type === "error");
      expect(errorChunk).toBeDefined();
      expect(errorChunk!.message).toContain("500");
    });

    it("limits tool call rounds to prevent infinite loops", async () => {
      const mockFetch = vi.mocked(fetch);
      const { executeTool } = await import("./ai-tools");
      vi.mocked(executeTool).mockResolvedValue("result");

      for (let i = 0; i < 10; i++) {
        mockFetch.mockResolvedValueOnce(
          makeFetchResponse({
            choices: [
              {
                message: {
                  content: "",
                  tool_calls: [
                    {
                      id: `call_${i}`,
                      type: "function",
                      function: { name: "search_products", arguments: "{}" },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          })
        );
      }

      const chunks: StreamChunk[] = [];
      for await (const chunk of streamAssistantWithTools("admin", "Loop test")) {
        chunks.push(chunk);
      }

      const doneChunk = chunks.find((c) => c.type === "done");
      expect(doneChunk).toBeDefined();
      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(7);
    });
  });
});
