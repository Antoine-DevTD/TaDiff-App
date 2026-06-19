import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </Card>
  );
}
