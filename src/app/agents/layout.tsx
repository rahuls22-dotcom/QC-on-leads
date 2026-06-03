import { AgentsUIProvider } from "@/components/agents/agents-ui";

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentsUIProvider>{children}</AgentsUIProvider>;
}
