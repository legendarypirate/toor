"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Settings,
  ShoppingCart,
  FolderOpen,
  Wallet,
  FileText,
  Ticket,
  Image,
  MessageSquare,
  Phone,
  Gift,
  Handshake,
  ChevronDown,
  LayoutDashboard,
  Package,
  Tag,
  Store,
  CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type IconType = React.ComponentType<{ className?: string }>;

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    id: "overview",
    label: "Ерөнхий",
    items: [{ href: "/admin", label: "Хянах самбар", icon: LayoutDashboard }],
  },
  {
    id: "catalog",
    label: "Каталог",
    items: [
      { href: "/admin/product", label: "Бүтээгдэхүүн", icon: Package },
      { href: "/admin/categories", label: "Ангилал", icon: FolderOpen },
      { href: "/admin/brands", label: "Брэндүүд", icon: Tag },
    ],
  },
  {
    id: "retail",
    label: "Дэлгүүр & байршил",
    items: [{ href: "/admin/stores", label: "Дэлгүүрүүд", icon: Store }],
  },
  {
    id: "commerce",
    label: "Захиалга & төлбөр",
    items: [
      { href: "/admin/order", label: "Захиалга", icon: ShoppingCart },
      { href: "/admin/qpay", label: "Qpay төлбөрүүд", icon: CreditCard },
      { href: "/admin/bank-accounts", label: "Банкны данс", icon: Wallet },
      { href: "/admin/coupons", label: "Урамшуулал", icon: Ticket },
    ],
  },
  {
    id: "content",
    label: "Агуулга & маркетинг",
    items: [
      { href: "/admin/banners", label: "Баннер", icon: Image },
      { href: "/admin/footer", label: "Footer", icon: FileText },
      { href: "/admin/partners", label: "Хамтран ажиллагсад", icon: Handshake },
    ],
  },
  {
    id: "users",
    label: "Хэрэглэгчид",
    items: [{ href: "/admin/users", label: "Хэрэглэгч", icon: Users }],
  },
  {
    id: "support",
    label: "Үйлчилгээ",
    items: [
      { href: "/admin/complaints", label: "Гомдол", icon: MessageSquare },
      { href: "/admin/call-sales", label: "Утасны харилцаа", icon: Phone },
      { href: "/admin/gift-settings", label: "Бэлгийн тохиргоо", icon: Gift },
    ],
  },
];

function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSectionActive(pathname: string | null, items: NavItem[]): boolean {
  return items.some((item) => isItemActive(pathname, item.href));
}

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      sections.forEach((s) => {
        if (isSectionActive(pathname, s.items)) {
          next[s.id] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  if (!mounted) {
    return (
      <aside className="flex w-64 flex-col border-r bg-background p-3">
        <div className="mb-4 h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/80" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Admin</p>
            <p className="text-[11px] text-muted-foreground">Удирдлагын самбар</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Үндсэн цэс">
        {sections.map((section) => {
          const expanded = open[section.id] ?? true;
          const activeInSection = isSectionActive(pathname, section.items);

          return (
            <div
              key={section.id}
              className={cn(
                "rounded-lg border border-transparent",
                activeInSection && "border-border bg-muted/40"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className="mb-0.5 h-9 w-full justify-between px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setOpen((o) => ({
                    ...o,
                    [section.id]: !expanded,
                  }))
                }
                aria-expanded={expanded}
              >
                {section.label}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", expanded ? "rotate-0" : "-rotate-90")}
                />
              </Button>
              {expanded && (
                <ul className="space-y-0.5 pb-2 pl-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-90" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
