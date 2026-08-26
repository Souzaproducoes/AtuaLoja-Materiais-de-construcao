import { describe, expect, it } from "vitest";
import { getConfiguredLlmProviders } from "./_core/llm";

describe("LLM provider configuration", () => {
  it("uses NVIDIA as primary and Groq as fallback", () => {
    const providers = getConfiguredLlmProviders({
      nvidiaApiKey: "nvidia-secret",
      nvidiaBaseUrl: "https://integrate.api.nvidia.com/v1",
      nvidiaModel: "nvidia-model",
      groqApiKey: "groq-secret",
      groqBaseUrl: "https://api.groq.com/openai/v1",
      groqModel: "groq-model",
      external-serviceApiKey: "",
      external-serviceApiUrl: "",
      isProduction: false,
    });
    expect(providers.map(provider => provider.name)).toEqual(["nvidia", "groq"]);
    expect(providers[0]?.model).toBe("nvidia-model");
    expect(providers[1]?.model).toBe("groq-model");
  });

  it("does not require external platform when NVIDIA or Groq is configured", () => {
    const providers = getConfiguredLlmProviders({
      nvidiaApiKey: "nvidia-secret",
      nvidiaBaseUrl: "https://integrate.api.nvidia.com/v1",
      nvidiaModel: "nvidia-model",
      groqApiKey: "",
      groqBaseUrl: "https://api.groq.com/openai/v1",
      groqModel: "groq-model",
      external-serviceApiKey: "",
      external-serviceApiUrl: "",
      isProduction: false,
    });
    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("nvidia");
  });
});
