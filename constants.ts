export const CATEGORIES = ["Roleplay", "Serious RP", "Training", "Community", "Other"] as const;

export const CALL_CATEGORIES = [
  "Traffic incident",
  "Vehicle accident",
  "Medical roleplay",
  "Fire roleplay",
  "Road closure",
  "General assistance",
] as const;

export const CALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const CALL_STATUSES = ["PENDING", "DISPATCHED", "EN_ROUTE", "ON_SCENE", "COMPLETED", "CANCELLED"] as const;

export const OPEN_CALL_STATUSES = ["PENDING", "DISPATCHED", "EN_ROUTE", "ON_SCENE"] as const;

export const UNIT_STATUSES = ["AVAILABLE", "BUSY", "EN_ROUTE", "ON_SCENE", "UNAVAILABLE"] as const;

export const DEPT_ICONS = ["User", "Shield", "Star", "Flame", "HeartPulse", "TrafficCone", "Radio", "Building2", "Siren", "Truck"] as const;

export const DEFAULT_DEPARTMENTS = [
  { name: "Civilian", slug: "civilian", color: "#A4AEC0", icon: "User", access: "OPEN", description: "Residents and visitors taking part in Liberty County roleplay." },
  { name: "Police", slug: "police", color: "#527DFF", icon: "Shield", access: "APPLICATION", description: "Municipal police patrol, traffic stops, and city calls." },
  { name: "Sheriff's Office", slug: "sheriff", color: "#F0A84D", icon: "Star", access: "APPLICATION", description: "County sheriff patrols, rural response, and court security." },
  { name: "Fire Department", slug: "fire", color: "#F05B65", icon: "Flame", access: "APPLICATION", description: "Fire suppression, rescue, and alarm roleplay." },
  { name: "EMS", slug: "ems", color: "#36C98A", icon: "HeartPulse", access: "APPLICATION", description: "Emergency medical response and hospital transports." },
  { name: "Department of Transportation", slug: "dot", color: "#E08A3C", icon: "TrafficCone", access: "APPLICATION", description: "Road closures, wreck clearance, and county infrastructure." },
  { name: "Communications / Dispatch", slug: "communications", color: "#A77BFF", icon: "Radio", access: "LOCKED", description: "County dispatch. Members of this department can run the dispatch center." },
] as const;

export const LOCATIONS = [
  { name: "Liberty Beach Pier", x: 248, y: 560 },
  { name: "Seaside Boulevard", x: 330, y: 500 },
  { name: "Harbor Point", x: 390, y: 430 },
  { name: "Harbor Bridge", x: 455, y: 455 },
  { name: "Downtown Liberty", x: 760, y: 300 },
  { name: "LCPD Headquarters", x: 690, y: 230 },
  { name: "County Hospital", x: 860, y: 345 },
  { name: "Fire Station 1", x: 640, y: 390 },
  { name: "Pine Ridge Park", x: 980, y: 150 },
  { name: "Maplewood Intersection", x: 900, y: 520 },
  { name: "North Bridge", x: 700, y: 150 },
  { name: "DOT Yard", x: 1040, y: 600 },
] as const;

export const CALL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  DISPATCHED: "Dispatched",
  EN_ROUTE: "En route",
  ON_SCENE: "On scene",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const UNIT_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  EN_ROUTE: "En route",
  ON_SCENE: "On scene",
  UNAVAILABLE: "Unavailable",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export function locationPoint(name: string) {
  return LOCATIONS.find((item) => item.name === name) ?? { name, x: 760, y: 320 };
}
