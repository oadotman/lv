"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Plus, Search, User, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

// Dynamically import UploadModal for code splitting
const UploadModal = dynamic(() => import("@/components/modals/UploadModal").then(mod => ({ default: mod.UploadModal })), {
  ssr: false,
});

interface TopBarProps {
  showUploadButton?: boolean;
}

export function TopBar({ showUploadButton = true }: TopBarProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user, organization } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Format plan name for display
  const getPlanName = (planType: string | undefined) => {
    if (!planType) return "Free Plan";

    switch (planType) {
      case "free":
        return "Free Plan";
      case "solo":
        return "Solo Plan";
      case "starter":
        return "Starter";
      case "professional":
        return "Professional";
      case "enterprise":
        return "Enterprise";
      case "custom":
        return "Enterprise";
      default:
        return "Free Plan";
    }
  };

  const planName = getPlanName(organization?.plan_type);

  return (
    <>
      <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-30 shadow-sm">
        <div className="h-full flex items-center justify-between px-6">
          {/* Enhanced Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors z-10" />
              <input
                type="text"
                placeholder="Search by customer, keywords, or date..."
                className="w-full pl-12 pr-24 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md focus:shadow-lg"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-sm">
                  <span className="text-sm">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>

          {/* Enhanced Right side actions */}
          <div className="flex items-center gap-3 ml-6">
            {showUploadButton && (
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 rounded-xl border-0 font-semibold group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-300" />
                <Plus className="w-4 h-4 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                <span className="relative z-10">Process New Call</span>
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

            {/* Profile */}
            <button className="flex items-center gap-3 pl-1 pr-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-sky-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{userName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {planName}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}
