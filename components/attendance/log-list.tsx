import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LogList({
  logs,
}: {
  logs: {
    id: string;
    type: "entry" | "exit" | string;
    timestamp: Date | string;
    userName: string;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s logs ({logs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No logs today.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  <span
                    className={
                      l.type === "entry" ? "text-green-700" : "text-slate-600"
                    }
                  >
                    {l.type}
                  </span>
                  {"  "}
                  {l.userName}
                </span>
                <span className="text-slate-500">
                  {new Date(l.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
