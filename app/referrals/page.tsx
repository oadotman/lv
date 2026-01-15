"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Copy,
  Gift,
  Users,
  TrendingUp,
  Share2,
  Mail,
  Twitter,
  Linkedin,
  CheckCircle,
  Clock,
  Award,
  DollarSign,
  Sparkles,
  ChevronRight,
  Info,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ReferralHistory } from "@/components/referrals/ReferralHistory";
import { ReferralRewards } from "@/components/referrals/ReferralRewards";
import { ReferralInviteModal } from "@/components/referrals/ReferralInviteModal";

interface ReferralStats {
  totalSent: number;
  totalClicks: number;
  totalSignups: number;
  totalActive: number;
  totalRewarded: number;
  currentTier: number;
  currentTierName: string;
  nextTier?: number;
  nextTierName?: string;
  progressToNextTier?: {
    current: number;
    required: number;
    percentage: number;
  };
  totalMinutesEarned: number;
  totalCreditsEarned: number;
  availableMinutes: number;
  availableCredits: number;
}

interface ReferralTier {
  tier_level: number;
  tier_name: string;
  referrals_required: number;
  reward_minutes: number;
  reward_credits_cents: number;
  description: string;
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tiers, setTiers] = useState<ReferralTier[]>([]);
  const [shareLinks, setShareLinks] = useState<any>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      // Fetch referral code and stats
      const response = await fetch("/api/referrals/generate");
      if (!response.ok) throw new Error("Failed to fetch referral data");

      const data = await response.json();
      setReferralCode(data.referralCode);
      setReferralLink(data.referralLink);
      setStats(data.statistics);
      setTiers(data.tiers);
      setShareLinks(data.shareLinks);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCredits = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Referral Program
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Invite friends and earn rewards when they become paying customers
          </p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Mail className="w-4 h-4 mr-2" />
          Invite Friends
        </Button>
      </div>

      {/* Current Tier & Progress */}
      {stats && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-blue-600 text-white">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {stats.currentTierName} Tier
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Level {stats.currentTier}
                  </p>
                </div>
              </div>

              {stats.progressToNextTier && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Progress to {stats.nextTierName}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {stats.progressToNextTier.current} / {stats.progressToNextTier.required} referrals
                    </span>
                  </div>
                  <Progress
                    value={stats.progressToNextTier.percentage}
                    className="h-3"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.progressToNextTier.required - stats.progressToNextTier.current} more
                    successful referral{stats.progressToNextTier.required - stats.progressToNextTier.current !== 1 ? 's' : ''} needed
                  </p>
                </div>
              )}
            </div>

            {/* Available Rewards */}
            <div className="ml-8 text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Available Rewards</p>
              <div className="space-y-1">
                {stats.availableMinutes > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.availableMinutes} minutes
                    </span>
                  </div>
                )}
                {stats.availableCredits > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCredits(stats.availableCredits)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Referral Link Section */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Share Your Referral Link</h3>
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Invitations
          </Button>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Button
                onClick={copyReferralLink}
                variant="ghost"
                className="rounded-none px-4"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(shareLinks.twitter, "_blank")}
              title="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(shareLinks.linkedin, "_blank")}
              title="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.href = shareLinks.email}
              title="Share via Email"
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Referral Code: <span className="font-mono font-semibold">{referralCode}</span>
        </p>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSent}
                </p>
              </div>
              <Share2 className="w-8 h-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sign-ups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSignups}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalActive}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rewarded</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRewarded}
                </p>
              </div>
              <Gift className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Reward Tiers */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reward Tiers</h3>
            <div className="space-y-3">
              {tiers.map((tier) => {
                const isCurrentTier = tier.tier_level === stats?.currentTier;
                const isAchieved = tier.tier_level <= (stats?.currentTier || 0);

                return (
                  <div
                    key={tier.tier_level}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      isCurrentTier
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : isAchieved
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              isAchieved
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            }`}
                          >
                            {isAchieved ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <span className="text-sm font-bold">{tier.tier_level}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {tier.tier_name}
                              {isCurrentTier && (
                                <Badge className="ml-2" variant="default">
                                  Current
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {tier.referrals_required} successful referral
                              {tier.referrals_required !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-11">
                          {tier.description}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="space-y-1">
                          {tier.reward_minutes > 0 && (
                            <div className="flex items-center justify-end gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold">
                                {tier.reward_minutes} mins
                              </span>
                            </div>
                          )}
                          {tier.reward_credits_cents > 0 && (
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-semibold">
                                {formatCredits(tier.reward_credits_cents)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-semibold">
                    1
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Share Your Link
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Send your unique referral link to friends and colleagues
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-semibold">
                    2
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    They Sign Up
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Your friends register using your referral link
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-semibold">
                    3
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    They Become Customers
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    When they upgrade to a paid plan, you get rewarded
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-semibold">
                    4
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Earn Rewards
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Get free minutes and credits based on your referral tier
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ReferralHistory />
        </TabsContent>

        <TabsContent value="rewards">
          <ReferralRewards />
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      {showInviteModal && (
        <ReferralInviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            fetchReferralData();
            setShowInviteModal(false);
          }}
          referralCode={referralCode}
        />
      )}
    </div>
  );
}