"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  Gift,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

interface Reward {
  id: string;
  reward_type: string;
  reward_minutes: number;
  reward_credits_cents: number;
  tier_reached: number;
  tier_name: string;
  claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at: string;
  referral?: {
    referred_email: string;
    referred_user?: {
      email: string;
      raw_user_meta_data?: {
        full_name?: string;
      };
    };
  };
}

interface RewardSummary {
  totalActive: number;
  totalExpired: number;
  totalAvailableMinutes: number;
  totalAvailableCredits: number;
}

export function ReferralRewards() {
  const [activeRewards, setActiveRewards] = useState<Reward[]>([]);
  const [expiredRewards, setExpiredRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/referrals/claim");
      if (!response.ok) throw new Error("Failed to fetch rewards");

      const data = await response.json();
      setActiveRewards(data.activeRewards);
      setExpiredRewards(data.expiredRewards);
      setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast({
        title: "Error",
        description: "Failed to load rewards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (rewardId?: string) => {
    try {
      setClaiming(rewardId || "all");

      const response = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rewardId,
          claimType: rewardId ? "single" : "all",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to claim rewards");
      }

      const data = await response.json();

      toast({
        title: "Success!",
        description: data.message,
      });

      // Refresh rewards
      await fetchRewards();
    } catch (error: any) {
      console.error("Error claiming reward:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    } finally {
      setClaiming(null);
    }
  };

  const formatCredits = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && summary.totalAvailableMinutes + summary.totalAvailableCredits > 0 && (
        <Card className="p-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Available Rewards
              </h3>
              <div className="flex gap-6">
                {summary.totalAvailableMinutes > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {summary.totalAvailableMinutes}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        minutes
                      </p>
                    </div>
                  </div>
                )}
                {summary.totalAvailableCredits > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCredits(summary.totalAvailableCredits)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        credits
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => claimReward()}
              disabled={claiming !== null}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {claiming === "all" ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Claiming...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim All Rewards
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Active Rewards */}
      {activeRewards.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Unclaimed Rewards</h3>
          <div className="grid gap-4">
            {activeRewards.map((reward) => (
              <Card key={reward.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-900/50">
                      <Gift className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {reward.tier_name} Tier Reward
                        </h4>
                        <Badge variant="outline">Level {reward.tier_reached}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {reward.reward_minutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{reward.reward_minutes} minutes</span>
                          </div>
                        )}
                        {reward.reward_credits_cents > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatCredits(reward.reward_credits_cents)}</span>
                          </div>
                        )}
                      </div>
                      {reward.referral?.referred_email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          From: {reward.referral.referred_user?.raw_user_meta_data?.full_name ||
                            reward.referral.referred_email}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Earned {format(new Date(reward.created_at), "MMM d, yyyy")}
                        {reward.expires_at && (
                          <span>
                            {" • Expires "}
                            {format(new Date(reward.expires_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => claimReward(reward.id)}
                    disabled={claiming !== null}
                  >
                    {claiming === reward.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
                    ) : (
                      "Claim"
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expired Rewards */}
      {expiredRewards.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            Expired Rewards
          </h3>
          <div className="grid gap-4 opacity-60">
            {expiredRewards.map((reward) => (
              <Card key={reward.id} className="p-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                        {reward.tier_name} Tier Reward
                      </h4>
                      <Badge variant="secondary">Expired</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {reward.reward_minutes > 0 && (
                        <span>{reward.reward_minutes} minutes</span>
                      )}
                      {reward.reward_credits_cents > 0 && (
                        <span>{formatCredits(reward.reward_credits_cents)}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Expired {format(new Date(reward.expires_at!), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeRewards.length === 0 && expiredRewards.length === 0 && (
        <Card className="p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Rewards Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start referring friends to earn rewards!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rewards are earned when your referred friends become paying customers.
          </p>
        </Card>
      )}
    </div>
  );
}