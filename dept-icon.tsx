import { Building2, Flame, HeartPulse, Radio, Shield, Siren, Star, TrafficCone, Truck, User, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Building2,
  Flame,
  HeartPulse,
  Radio,
  Shield,
  Siren,
  Star,
  TrafficCone,
  Truck,
  User,
};

export function DeptIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Building2;
  return <Icon className={className} />;
}
