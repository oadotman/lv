// =====================================================
// PARTNER APPLICATION FORM
// Application form for the LoadVoice Partner Program
// =====================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ApplicationFormData {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  website: string;
  partner_type: string;
  clients_per_year: string;
  crms_used: string[];
  how_heard: string;
  why_partner: string;
  has_used_loadvoice: string;
  terms_accepted: boolean;
}

const CRM_OPTIONS = [
  'Salesforce',
  'HubSpot',
  'Pipedrive',
  'Microsoft Dynamics',
  'Zoho CRM',
  'Monday.com',
  'Close',
  'Other',
];

export default function PartnerApplicationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ApplicationFormData>({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    website: '',
    partner_type: '',
    clients_per_year: '',
    crms_used: [],
    how_heard: '',
    why_partner: '',
    has_used_loadvoice: '',
    terms_accepted: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.partner_type) {
      errors.partner_type = 'Please select your role';
    }

    if (!formData.clients_per_year) {
      errors.clients_per_year = 'Please select how many clients you work with';
    }

    if (formData.crms_used.length === 0) {
      errors.crms_used = 'Please select at least one CRM';
    }

    if (!formData.why_partner.trim()) {
      errors.why_partner = 'Please tell us why you want to become a partner';
    } else if (formData.why_partner.length < 10) {
      errors.why_partner = 'Please provide more detail (minimum 10 characters)';
    }

    if (!formData.has_used_loadvoice) {
      errors.has_used_loadvoice = 'Please let us know if you have used LoadVoice';
    }

    if (!formData.terms_accepted) {
      errors.terms_accepted = 'You must accept the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      setSubmitted(true);
      toast({
        title: 'Application Submitted',
        description: 'We will review your application within 2 business days',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast({
        title: 'Error',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCRMToggle = (crm: string) => {
    setFormData(prev => ({
      ...prev,
      crms_used: prev.crms_used.includes(crm)
        ? prev.crms_used.filter(c => c !== crm)
        : [...prev.crms_used, crm],
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
                <p className="text-gray-600 mb-6">
                  Thank you for applying to the LoadVoice Partner Program.
                  We will review your application and get back to you within 2 business days.
                </p>
                <p className="text-gray-600 mb-8">
                  You will receive a confirmation email at <strong>{formData.email}</strong>
                </p>
                <Link href="/">
                  <Button>Return to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-6">
          <Link href="/partners">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Partner Program
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Apply to Become a Partner</CardTitle>
            <CardDescription>
              Join the LoadVoice Partner Program and earn 25-30% recurring commissions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="John Doe"
                      className={validationErrors.full_name ? 'border-red-500' : ''}
                    />
                    {validationErrors.full_name && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_name">Company Name (Optional)</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      placeholder="Acme Consulting"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website or LinkedIn Profile URL (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://example.com or https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>

              {/* About Your Business */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">About Your Business</h3>

                <div>
                  <Label htmlFor="partner_type">What do you do? *</Label>
                  <Select
                    value={formData.partner_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, partner_type: value })
                    }
                  >
                    <SelectTrigger
                      className={validationErrors.partner_type ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crm_consultant">CRM Consultant</SelectItem>
                      <SelectItem value="fractional_sales_leader">Fractional Sales Leader</SelectItem>
                      <SelectItem value="sales_coach">Sales Coach</SelectItem>
                      <SelectItem value="revops_consultant">RevOps Consultant</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.partner_type && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.partner_type}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="clients_per_year">
                    How many clients do you typically work with per year? *
                  </Label>
                  <Select
                    value={formData.clients_per_year}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clients_per_year: value })
                    }
                  >
                    <SelectTrigger
                      className={validationErrors.clients_per_year ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 clients</SelectItem>
                      <SelectItem value="6-10">6-10 clients</SelectItem>
                      <SelectItem value="11-20">11-20 clients</SelectItem>
                      <SelectItem value="21-50">21-50 clients</SelectItem>
                      <SelectItem value="50+">50+ clients</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.clients_per_year && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.clients_per_year}</p>
                  )}
                </div>

                <div>
                  <Label>Which CRMs do your clients use? (Select all that apply) *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {CRM_OPTIONS.map((crm) => (
                      <div key={crm} className="flex items-center space-x-2">
                        <Checkbox
                          id={`crm-${crm}`}
                          checked={formData.crms_used.includes(crm)}
                          onCheckedChange={() => handleCRMToggle(crm)}
                        />
                        <Label
                          htmlFor={`crm-${crm}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {crm}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {validationErrors.crms_used && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.crms_used}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="how_heard">How did you hear about LoadVoice? (Optional)</Label>
                  <Input
                    id="how_heard"
                    value={formData.how_heard}
                    onChange={(e) =>
                      setFormData({ ...formData, how_heard: e.target.value })
                    }
                    placeholder="e.g., Google search, LinkedIn, referral..."
                  />
                </div>
              </div>

              {/* Why Partner */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Why Partner with LoadVoice?</h3>

                <div>
                  <Label htmlFor="why_partner">
                    Why do you want to become a LoadVoice partner? *
                  </Label>
                  <Textarea
                    id="why_partner"
                    value={formData.why_partner}
                    onChange={(e) =>
                      setFormData({ ...formData, why_partner: e.target.value })
                    }
                    placeholder="Tell us about your interest in partnering with LoadVoice..."
                    rows={4}
                    className={validationErrors.why_partner ? 'border-red-500' : ''}
                  />
                  {validationErrors.why_partner && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.why_partner}</p>
                  )}
                </div>

                <div>
                  <Label>Have you used LoadVoice yourself? *</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="used_yes"
                        name="has_used_loadvoice"
                        value="yes"
                        checked={formData.has_used_loadvoice === 'yes'}
                        onChange={(e) =>
                          setFormData({ ...formData, has_used_loadvoice: e.target.value })
                        }
                        className="cursor-pointer"
                      />
                      <Label htmlFor="used_yes" className="cursor-pointer font-normal">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="used_no"
                        name="has_used_loadvoice"
                        value="no"
                        checked={formData.has_used_loadvoice === 'no'}
                        onChange={(e) =>
                          setFormData({ ...formData, has_used_loadvoice: e.target.value })
                        }
                        className="cursor-pointer"
                      />
                      <Label htmlFor="used_no" className="cursor-pointer font-normal">
                        No
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="used_not_yet"
                        name="has_used_loadvoice"
                        value="not_yet"
                        checked={formData.has_used_loadvoice === 'not_yet'}
                        onChange={(e) =>
                          setFormData({ ...formData, has_used_loadvoice: e.target.value })
                        }
                        className="cursor-pointer"
                      />
                      <Label htmlFor="used_not_yet" className="cursor-pointer font-normal">
                        Not yet
                      </Label>
                    </div>
                  </div>
                  {validationErrors.has_used_loadvoice && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.has_used_loadvoice}</p>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.terms_accepted}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, terms_accepted: checked as boolean })
                    }
                  />
                  <div>
                    <Label htmlFor="terms" className="cursor-pointer">
                      I agree to the{' '}
                      <Link href="/partners/terms" className="text-blue-600 hover:underline">
                        Partner Program Terms and Conditions
                      </Link>{' '}
                      *
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      This includes no spamming, no misleading claims, and adherence to payment terms.
                    </p>
                  </div>
                </div>
                {validationErrors.terms_accepted && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.terms_accepted}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/partners')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}