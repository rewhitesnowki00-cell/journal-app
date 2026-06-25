"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Search, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "タイムライン", icon: CalendarDays },
  { href: "/tasks", label: "タスク", icon: CheckSquare },
  { href: "/search", label: "検索", icon: Search },
  { href: "/settings", label: "設定", icon: Settings },
];

// Link の子で useLinkStatus を使い、タップ直後（遷移完了前）に即ハイライトする
function TabContent({ label, icon: Icon, active }: { label: string; icon: LucideIcon; active: boolean }) {
  const { pending } = useLinkStatus();
  const highlight = active || pending;
  return (
    <span
      className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition-colors ${
        highlight ? "bg-indigo-50 font-semibold text-indigo-600" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon size={21} strokeWidth={highlight ? 2.4 : 1.8} />
      <span>{label}</span>
    </span>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="flex items-stretch gap-1 rounded-2xl border border-black/5 bg-white/80 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-1 [touch-action:manipulation] active:scale-95 transition-transform"
            >
              <TabContent label={label} icon={icon} active={pathname === href} />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
