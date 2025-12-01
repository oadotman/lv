import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";
import { getPlanDetails } from "@/lib/pricing";

export default async function SettingsPage() {
  const supabase = createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get user's organization and plan details
  // Use maybeSingle() to handle users with multiple orgs
  const { data: userOrgs } = await supabase
    .from("user_organizations")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!userOrgs || userOrgs.length === 0) {
    return <div>No organization found</div>;
  }

  // For now, use the first organization or the one where user has highest role
  const userOrg = userOrgs.find(org => org.role === 'owner') ||
                   userOrgs.find(org => org.role === 'admin') ||
                   userOrgs[0];

  // Get full organization details
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", userOrg.organization_id)
    .single();

  if (!organization) {
    return <div>Organization not found</div>;
  }

  // Get plan details
  const planDetails = getPlanDetails(organization.plan_type as any);

  // Get current usage
  const { data: usageData } = await supabase
    .from("organizations")
    .select("minutes_used_this_month, overage_minutes_purchased")
    .eq("id", userOrg.organization_id)
    .single();

  const minutesUsed = usageData?.minutes_used_this_month || 0;
  const minutesTotal = organization.max_minutes_monthly || planDetails.maxMinutes;
  const usagePercentage = Math.min((minutesUsed / minutesTotal) * 100, 100);

  // Get billing history from audit logs (if paddle transactions exist)
  const { data: billingHistory } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", userOrg.organization_id)
    .eq("action", "payment_completed")
    .order("created_at", { ascending: false })
    .limit(10);

  // Prepare user data
  const userData = {
    email: user.email || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    company: organization.name || "",
  };

  // Prepare billing data
  const billingData = {
    currentPlan: planDetails.name,
    planType: organization.plan_type,
    minutesUsed,
    minutesTotal,
    usagePercentage,
    nextBillingDate: organization.current_period_end
      ? new Date(organization.current_period_end).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A",
    subscriptionStatus: organization.subscription_status || "active",
    billingHistory: billingHistory || [],
  };

  return (
    <SettingsClient
      user={userData}
      billing={billingData}
      organizationId={userOrg.organization_id}
      userId={user.id}
    />
  );
}
