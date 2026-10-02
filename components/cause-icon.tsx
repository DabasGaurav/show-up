import { BookOpen, HandHeart, HeartPulse, Laptop, PawPrint, Soup, Sprout, type LucideIcon } from "lucide-react";

const ICON: Record<string, LucideIcon> = {
  Teaching: BookOpen,
  Food: Soup,
  "Trees & green": Sprout,
  Animals: PawPrint,
  Health: HeartPulse,
  Elders: HandHeart,
  Skills: Laptop,
};

export function CauseIcon({ cause, className }: { cause: string; className?: string }) {
  const Icon = ICON[cause] ?? HandHeart;
  return <Icon className={className} aria-hidden />;
}
