import {
  LayoutDashboard,
  Globe2,
  Sparkles,
  Rocket,
  CalendarClock,
  TrendingUp,
  Gauge,
  PieChart,
  PackageSearch,
  Activity,
  BadgeIndianRupee,
  Building2,
  Star,
  Bell,
  FlaskConical,
  Wallet,
  BrainCircuit,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Market Universe", href: "/universe", icon: Globe2 },
    ],
  },
  {
    title: "Signals",
    items: [
      { label: "Emerging Opportunities", href: "/emerging", icon: Sparkles },
      { label: "Multibagger Radar", href: "/multibagger", icon: Rocket },
      { label: "Earnings Radar", href: "/earnings-radar", icon: CalendarClock },
      { label: "Earnings Surprises", href: "/earnings-surprises", icon: BadgeIndianRupee },
      { label: "Growth Acceleration", href: "/growth-acceleration", icon: TrendingUp },
      { label: "Margin Expansion", href: "/margin-expansion", icon: Gauge },
      { label: "Order Book Radar", href: "/order-book", icon: PackageSearch },
      { label: "Momentum", href: "/momentum", icon: Activity },
      { label: "Valuation", href: "/valuation", icon: PieChart },
    ],
  },
  {
    title: "Research",
    items: [
      { label: "Sector Intelligence", href: "/sectors", icon: Building2 },
      { label: "Watchlist", href: "/watchlist", icon: Star },
      { label: "Alerts", href: "/alerts", icon: Bell },
      { label: "Backtesting", href: "/backtesting", icon: FlaskConical },
      { label: "Paper Portfolio", href: "/paper-portfolio", icon: Wallet },
      { label: "Research", href: "/research", icon: BrainCircuit },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];
