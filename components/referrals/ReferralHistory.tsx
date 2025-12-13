"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  UserPlus,
  MousePointer,
  Gift,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

interface Referral {
  id: string;
  referral_code: string;
  referred_email: string;
  referred_user?: {
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  };
  status: string;
  clicked_count: number;
  signup_at?: string;
  activated_at?: string;
  rewarded_at?: string;
  reward_minutes?: number;
  reward_credits_cents?: number;
  created_at: string;
}

export function ReferralHistory() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchReferrals();
  }, [statusFilter, page]);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/referrals/history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch referrals");

      const data = await response.json();
      setReferrals(data.referrals);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.total);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast({
        title: "Error",
        description: "Failed to load referral history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        label: "Pending",
        variant: "secondary" as const,
        icon: Clock,
      },
      clicked: {
        label: "Clicked",
        variant: "outline" as const,
        icon: MousePointer,
      },
      signed_up: {
        label: "Signed Up",
        variant: "default" as const,
        icon: UserPlus,
      },
      active: {
        label: "Active",
        variant: "default" as const,
        icon: CheckCircle,
        className: "bg-green-600 hover:bg-green-700",
      },
      rewarded: {
        label: "Rewarded",
        variant: "default" as const,
        icon: Gift,
        className: "bg-violet-600 hover:bg-violet-700",
      },
      expired: {
        label: "Expired",
        variant: "secondary" as const,
        icon: AlertCircle,
      },
    };

    const { label, variant, icon: Icon, className } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant} className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatCredits = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading && referrals.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="signed_up">Signed Up</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rewarded">Rewarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {totalCount} referral{totalCount !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Referrals Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start inviting friends to earn rewards!
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Date Invited</TableHead>
                    <TableHead>Rewards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {referral.referred_email}
                          </p>
                          {referral.referred_user?.raw_user_meta_data?.full_name && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {referral.referred_user.raw_user_meta_data.full_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-gray-400">
                          {referral.clicked_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-gray-400">
                          {format(new Date(referral.created_at), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {referral.status === "rewarded" && (
                          <div className="space-y-1">
                            {referral.reward_minutes && referral.reward_minutes > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="w-3 h-3 text-violet-600" />
                                <span>{referral.reward_minutes} mins</span>
                              </div>
                            )}
                            {referral.reward_credits_cents && referral.reward_credits_cents > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <span className="text-green-600">
                                  {formatCredits(referral.reward_credits_cents)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {referral.status === "active" && (
                          <span className="text-sm text-amber-600 dark:text-amber-400">
                            Pending reward
                          </span>
                        )}
                        {["pending", "clicked", "signed_up"].includes(referral.status) && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}