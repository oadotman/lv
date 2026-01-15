"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Building,
  Upload,
  Save,
  FileText,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Trash2
} from "lucide-react";

interface CompanyProfile {
  id: string;
  name: string;
  company_address: string | null;
  company_city: string | null;
  company_state: string | null;
  company_zip: string | null;
  mc_number: string | null;
  dot_number: string | null;
  logo_url: string | null;
  rate_con_terms: string | null;
  default_payment_terms: string | null;
  billing_email: string | null;
}

const DEFAULT_TERMS_TEMPLATE = `TERMS AND CONDITIONS:

1. CARRIER LIABILITY: Carrier agrees to maintain cargo insurance of at least $100,000 per occurrence and auto liability of at least $1,000,000.

2. PAYMENT: Payment will be made within 30 days of receipt of signed proof of delivery (POD) and carrier's invoice.

3. DETENTION: Free time of 2 hours at pickup and 2 hours at delivery. Detention paid at $75/hour after free time with prior authorization.

4. TONU: If load is cancelled after carrier is dispatched, a $250 Truck Ordered Not Used fee applies.

5. DOUBLE BROKERING: Carrier agrees not to re-broker, co-broker, or assign this load without written consent.

6. This rate confirmation, when signed, constitutes a binding contract.`;

const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Quick Pay - 2%",
  "Quick Pay - 3%",
  "Quick Pay - 5%",
  "COD",
  "Upon Receipt",
  "Custom"
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function CompanyProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");

  useEffect(() => {
    fetchCompanyProfile();
  }, [user]);

  async function fetchCompanyProfile() {
    if (!user) return;

    try {
      // Get user's organization
      const { data: userOrg, error: orgError } = await supabase
        .from("user_organizations")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .single();

      if (orgError) {
        console.error("Error fetching user organization:", orgError);
        toast({
          title: "Error",
          description: "Failed to load organization data",
          variant: "destructive",
        });
        return;
      }

      setUserRole(userOrg.role);
      setOrganizationId(userOrg.organization_id);

      // Fetch organization details
      const { data: org, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userOrg.organization_id)
        .single();

      if (error) {
        console.error("Error fetching company profile:", error);
        toast({
          title: "Error",
          description: "Failed to load company profile",
          variant: "destructive",
        });
        return;
      }

      setProfile(org);
      if (org.logo_url) {
        setLogoPreview(org.logo_url);
      }
    } catch (error) {
      console.error("Error loading company profile:", error);
      toast({
        title: "Error",
        description: "Failed to load company profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  }

  async function uploadLogoToSupabase() {
    if (!logoFile || !profile) return null;

    try {
      setUploadingLogo(true);

      // Delete old logo if it exists
      if (profile.logo_url) {
        const oldLogoPath = profile.logo_url.split("/").pop();
        if (oldLogoPath) {
          await supabase.storage
            .from("company-logos")
            .remove([`${organizationId}/${oldLogoPath}`]);
        }
      }

      // Upload new logo
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("company-logos")
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Error uploading logo:", error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (!profile || !profile.logo_url) return;

    try {
      // Delete from storage
      const logoPath = profile.logo_url.split("/").pop();
      if (logoPath) {
        await supabase.storage
          .from("company-logos")
          .remove([`${organizationId}/${logoPath}`]);
      }

      // Update profile
      setProfile({ ...profile, logo_url: null });
      setLogoPreview(null);
      setLogoFile(null);
      setHasChanges(true);
    } catch (error) {
      console.error("Error removing logo:", error);
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive",
      });
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;

    // Validate required fields for rate confirmations
    const errors: string[] = [];

    if (!profile.mc_number && !profile.dot_number) {
      errors.push("MC Number or DOT Number is required for rate confirmations");
    }

    if (!profile.billing_email && !profile.company_address) {
      errors.push("At least one contact method (email or address) is required");
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      let logoUrl = profile.logo_url;

      // Upload logo if there's a new one
      if (logoFile) {
        const uploadedUrl = await uploadLogoToSupabase();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Update organization profile
      const { error } = await supabase
        .from("organizations")
        .update({
          name: profile.name,
          company_address: profile.company_address,
          company_city: profile.company_city,
          company_state: profile.company_state,
          company_zip: profile.company_zip,
          mc_number: profile.mc_number,
          dot_number: profile.dot_number,
          logo_url: logoUrl,
          rate_con_terms: profile.rate_con_terms,
          default_payment_terms: profile.default_payment_terms,
          billing_email: profile.billing_email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Company profile updated successfully",
      });

      setHasChanges(false);
      setLogoFile(null);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save company profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(field: keyof CompanyProfile, value: string) {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
    setHasChanges(true);
  }

  function applyDefaultTerms() {
    if (!profile) return;
    setProfile({ ...profile, rate_con_terms: DEFAULT_TERMS_TEMPLATE });
    setHasChanges(true);
    toast({
      title: "Default terms applied",
      description: "You can customize these terms as needed",
    });
  }

  const canEdit = ["owner", "admin"].includes(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">No Organization Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Unable to load company profile. Please try again later.</p>
            <Button className="mt-4" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Company Profile</h1>
          <p className="text-gray-600">
            Manage your company information for rate confirmations and documents
          </p>
        </div>
        {hasChanges && (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic company details displayed on rate confirmations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Name & Logo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={profile.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="w-24 h-24 object-contain rounded-lg border"
                    />
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {canEdit && (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploadingLogo}
                    />
                    <Label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Label>
                    <p className="text-xs text-gray-500">
                      PNG or JPG, max 5MB
                      <br />
                      Recommended: 400px wide
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Company Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={profile.company_address || ""}
                  onChange={(e) => handleFieldChange("company_address", e.target.value)}
                  disabled={!canEdit}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.company_city || ""}
                  onChange={(e) => handleFieldChange("company_city", e.target.value)}
                  disabled={!canEdit}
                  placeholder="Chicago"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={profile.company_state || ""}
                  onValueChange={(value) => handleFieldChange("company_state", value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={profile.company_zip || ""}
                  onChange={(e) => handleFieldChange("company_zip", e.target.value)}
                  disabled={!canEdit}
                  placeholder="60601"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Authority Numbers */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Authority Numbers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mc-number">
                  MC Number
                  {(!profile.mc_number && !profile.dot_number) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Input
                  id="mc-number"
                  value={profile.mc_number || ""}
                  onChange={(e) => handleFieldChange("mc_number", e.target.value)}
                  disabled={!canEdit}
                  placeholder="MC-123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dot-number">
                  DOT Number
                  {(!profile.mc_number && !profile.dot_number) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Input
                  id="dot-number"
                  value={profile.dot_number || ""}
                  onChange={(e) => handleFieldChange("dot_number", e.target.value)}
                  disabled={!canEdit}
                  placeholder="1234567"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              At least one authority number (MC or DOT) is required for generating rate confirmations
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="billing-email">
                Billing Email
                {(!profile.billing_email && !profile.company_address) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Input
                id="billing-email"
                type="email"
                value={profile.billing_email || ""}
                onChange={(e) => handleFieldChange("billing_email", e.target.value)}
                disabled={!canEdit}
                placeholder="billing@company.com"
              />
              <p className="text-xs text-gray-500">
                Email address for invoices and billing communications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Confirmation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Rate Confirmation Settings
          </CardTitle>
          <CardDescription>
            Default terms and payment options for rate confirmations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="payment-terms">Default Payment Terms</Label>
            <Select
              value={profile.default_payment_terms || "Net 30"}
              onValueChange={(value) => handleFieldChange("default_payment_terms", value)}
              disabled={!canEdit}
            >
              <SelectTrigger id="payment-terms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS_OPTIONS.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate Confirmation Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate-con-terms">Rate Confirmation Terms & Conditions</Label>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyDefaultTerms}
                  className="text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Use Default Template
                </Button>
              )}
            </div>
            <Textarea
              id="rate-con-terms"
              value={profile.rate_con_terms || ""}
              onChange={(e) => handleFieldChange("rate_con_terms", e.target.value)}
              disabled={!canEdit}
              rows={12}
              className="font-mono text-xs"
              placeholder="Enter your rate confirmation terms and conditions..."
            />
            <p className="text-xs text-gray-500">
              These terms will be included in all rate confirmations. You can customize them for each load if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={!hasChanges || saving || uploadingLogo}
            className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {!canEdit && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              You need Admin or Owner permissions to edit company profile settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}