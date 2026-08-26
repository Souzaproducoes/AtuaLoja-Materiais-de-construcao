import AskCard from "@/components/AskCard";

export default function AssistantLauncher({ module }: { module: "customer" | "delivery" | "admin" }) {
  return <AskCard module={module} />;
}
