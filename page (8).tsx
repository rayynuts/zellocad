import { ServerComposer } from "@/components/server-composer";

export const metadata = { title: "Create server" };

export default function NewServerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Create a server</h1>
        <p className="text-sm text-muted">You can own as many communities as you need. Each one keeps its own members, departments, and CAD records.</p>
      </div>
      <ServerComposer mode="create" />
    </div>
  );
}
