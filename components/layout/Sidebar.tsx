"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  FileText,
  Settings,
  HelpCircle,
  User,
  Menu,
  X,
  BarChart3,
  ChevronDown,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import styles from "./Sidebar.module.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Phone, label: "Calls", href: "/calls" },
  { icon: FileText, label: "Templates", href: "/templates" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Users, label: "Team", href: "/settings/team" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const SidebarContent = () => (
    <div className={styles.sidebarContent}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <Link href="/" className={styles.logoLink}>
          <div className={styles.logoIcon}>
            <Phone className="w-5 h-5 text-white" />
          </div>
          <span className={styles.logoText}>SynQall</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className={styles.navSection}>
        {navItems.map((item) => {
          // Only highlight exact matches to avoid multiple items being active
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                styles.navLink,
                isActive && styles.navLinkActive
              )}
            >
              <Icon
                className={styles.navIcon}
              />
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && (
                <div className={styles.navIndicator} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={styles.bottomSection}>
        <Link
          href="/help"
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            styles.bottomLink,
            pathname === "/help" && styles.bottomLinkActive
          )}
        >
          <HelpCircle
            className={styles.navIcon}
          />
          <span>Help Center</span>
        </Link>

        {/* User profile with dropdown */}
        <div className={styles.profileSection}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.profileCard}>
                <div className={styles.profileAvatar}>
                  <User className="text-white w-5 h-5" />
                </div>
                <div className={styles.profileInfo}>
                  <p className={styles.profileName}>{userName}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl dark:bg-slate-800 dark:border-slate-700">
              <DropdownMenuItem
                className="rounded-lg cursor-pointer dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                onClick={() => router.push('/settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-950/50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-gray-700 dark:text-slate-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700 dark:text-slate-300" />
        )}
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 dark:bg-black/80"
          onClick={() => setIsMobileOpen(false)}
        >
          <aside
            className="fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-slate-900 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex-col shadow-xl z-40"
      >
        <SidebarContent />
      </aside>
    </>
  );
}
