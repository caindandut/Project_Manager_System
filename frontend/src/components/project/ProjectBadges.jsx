import { Badge } from "@/components/ui/badge";
import { PRIORITY_OPTIONS } from "@/constants/projectUi";

export function PriorityBadge({ priority, className = "" }) {
  const opt = PRIORITY_OPTIONS.find((o) => o.value === priority);
  if (!opt) return null;
  return <Badge className={`${opt.className} ${className}`.trim()}>{opt.label}</Badge>;
}

export function LabelBadges({ label, badgeClassName = "text-xs" }) {
  if (!label) return null;
  const labels = label.split(",").map((s) => s.trim()).filter(Boolean);
  if (labels.length === 0) return null;
  return (
    <>
      {labels.map((l) => (
        <Badge key={l} variant="outline" className={badgeClassName}>
          {l}
        </Badge>
      ))}
    </>
  );
}
