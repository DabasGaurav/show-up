import { BookOpen, HandHeart, HeartPulse, Laptop, LifeBuoy, PawPrint, Soup, Sprout, type LucideIcon } from "lucide-react";

const ICON: Record<string, LucideIcon> = {
  Teaching: BookOpen,
  Plantation: Sprout,
  "Food distribution": Soup,
  "Animal welfare": PawPrint,
  "Health camps": HeartPulse,
  "Elderly care": HandHeart,
  "Disaster relief": LifeBuoy,
  "Skill-based": Laptop,
};

export function CauseIcon({ cause, className }: { cause: string; className?: string }) {
  const Icon = ICON[cause] ?? HandHeart;
  return <Icon className={className} aria-hidden />;
}
