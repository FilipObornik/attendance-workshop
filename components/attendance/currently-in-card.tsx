import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CurrentlyInCard({
  items,
}: {
  items: { id: string; name: string; since: Date | string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Currently in ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nobody&apos;s in.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.name}</span>
                <span className="text-slate-500">
                  since {new Date(i.since).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
