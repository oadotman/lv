'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InfoIcon, ShieldAlert, Check, AlertTriangle, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const TWO_PARTY_CONSENT_STATES = [
  { code: 'CA', name: 'California' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'FL', name: 'Florida' },
  { code: 'IL', name: 'Illinois' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MT', name: 'Montana' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'WA', name: 'Washington' },
];

const DEFAULT_MESSAGE = 'Thank you for calling. This call may be recorded for quality and training purposes.';

export default function RecordingDisclosureSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    always_announce_recording: true,
    never_announce_recording: false,
    recording_disclosure_message: '',
  });
  const [complianceStats, setComplianceStats] = useState<any>(null);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadComplianceStats();
  }, []);

  const loadSettings = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setUserEmail(user.email || '');

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgData) return;

      setOrgId(orgData.organization_id);

      const { data, error } = await supabase
        .from('organizations')
        .select('always_announce_recording, never_announce_recording, recording_disclosure_message')
        .eq('id', orgData.organization_id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          always_announce_recording: data.always_announce_recording ?? true,
          never_announce_recording: data.never_announce_recording ?? false,
          recording_disclosure_message: data.recording_disclosure_message || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load recording settings');
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceStats = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgData) return;

      const { data, error } = await supabase
        .rpc('get_recording_compliance_summary', {
          p_organization_id: orgData.organization_id,
          p_days_back: 30
        });

      if (!error && data) {
        setComplianceStats(data);
      }
    } catch (error) {
      console.error('Error loading compliance stats:', error);
    }
  };

  const logComplianceModeChange = async (newMode: string, disclaimerSigned: boolean = false) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !orgId) return;

      // Log to compliance_mode_changes audit table
      await supabase.from('compliance_mode_changes').insert({
        organization_id: orgId,
        user_id: user.id,
        user_email: userEmail,
        previous_mode: getCurrentMode(),
        new_mode: newMode,
        disclaimer_accepted: disclaimerSigned,
        ip_address: await fetch('https://api.ipify.org?format=json')
          .then(r => r.json())
          .then(data => data.ip)
          .catch(() => 'unknown'),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });

      // If switching to "never", also log the legal disclaimer acceptance
      if (newMode === 'never' && disclaimerSigned) {
        await supabase.from('legal_disclaimer_acceptances').insert({
          organization_id: orgId,
          user_id: user.id,
          user_email: userEmail,
          disclaimer_type: 'recording_disclosure_disabled',
          disclaimer_version: '1.0',
          disclaimer_text: LEGAL_DISCLAIMER_TEXT,
          accepted_at: new Date().toISOString(),
          ip_address: await fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(data => data.ip)
            .catch(() => 'unknown'),
        });
      }
    } catch (error) {
      console.error('Error logging compliance mode change:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgData) {
        throw new Error('No organization found');
      }

      // Validate settings
      if (settings.always_announce_recording && settings.never_announce_recording) {
        toast.error('Cannot enable both "always" and "never" announce settings');
        return;
      }

      // Log the mode change
      await logComplianceModeChange(getCurrentMode(), disclaimerAccepted);

      const { error } = await supabase
        .from('organizations')
        .update({
          always_announce_recording: settings.always_announce_recording,
          never_announce_recording: settings.never_announce_recording,
          recording_disclosure_message: settings.recording_disclosure_message || null,
        })
        .eq('id', orgData.organization_id);

      if (error) throw error;

      toast.success('Recording disclosure settings updated');
      loadComplianceStats(); // Refresh stats
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = async (mode: 'always' | 'smart' | 'never') => {
    // If switching to "never", show legal disclaimer first
    if (mode === 'never' && !settings.never_announce_recording) {
      setShowLegalDisclaimer(true);
      return;
    }

    // For other modes, change immediately
    switch (mode) {
      case 'always':
        setSettings({
          ...settings,
          always_announce_recording: true,
          never_announce_recording: false,
        });
        break;
      case 'smart':
        setSettings({
          ...settings,
          always_announce_recording: false,
          never_announce_recording: false,
        });
        break;
      case 'never':
        // Only set if disclaimer was accepted
        setSettings({
          ...settings,
          always_announce_recording: false,
          never_announce_recording: true,
        });
        break;
    }
  };

  const handleDisclaimerAccept = () => {
    if (!disclaimerAccepted) {
      toast.error('You must accept the legal disclaimer to continue');
      return;
    }

    // Set to never mode
    setSettings({
      ...settings,
      always_announce_recording: false,
      never_announce_recording: true,
    });

    setShowLegalDisclaimer(false);
    toast.warning('Recording disclosure disabled. You assume all legal liability.');
  };

  const getCurrentMode = () => {
    if (settings.always_announce_recording) return 'always';
    if (settings.never_announce_recording) return 'never';
    return 'smart';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recording Disclosure Settings</CardTitle>
          <CardDescription>
            Configure how and when callers are notified about call recording for legal compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Mode Selection */}
          <div className="space-y-4">
            <Label>Disclosure Mode</Label>

            <div className="grid gap-4">
              {/* Always Announce (Recommended) */}
              <div
                className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                  getCurrentMode() === 'always' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => handleModeChange('always')}
              >
                <div className="flex items-start space-x-3">
                  <div className="pt-1">
                    <input
                      type="radio"
                      checked={getCurrentMode() === 'always'}
                      onChange={() => handleModeChange('always')}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Always Announce</span>
                      <Badge variant="default" className="text-xs">Recommended</Badge>
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Play recording disclosure on every call, regardless of caller location.
                      Maximum legal protection.
                    </p>
                  </div>
                  {getCurrentMode() === 'always' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>

              {/* Smart Mode */}
              <div
                className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                  getCurrentMode() === 'smart' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => handleModeChange('smart')}
              >
                <div className="flex items-start space-x-3">
                  <div className="pt-1">
                    <input
                      type="radio"
                      checked={getCurrentMode() === 'smart'}
                      onChange={() => handleModeChange('smart')}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Smart Detection</span>
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically detect two-party consent states and play disclosure only when required.
                      Relies on Twilio's state detection.
                    </p>
                  </div>
                  {getCurrentMode() === 'smart' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>

              {/* Never Announce (Risky) */}
              <div
                className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                  getCurrentMode() === 'never' ? 'border-destructive bg-destructive/5' : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => handleModeChange('never')}
              >
                <div className="flex items-start space-x-3">
                  <div className="pt-1">
                    <input
                      type="radio"
                      checked={getCurrentMode() === 'never'}
                      onChange={() => handleModeChange('never')}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Never Announce</span>
                      <Badge variant="destructive" className="text-xs">Legal Risk</Badge>
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Never play recording disclosure. Use only if you have other means of obtaining consent.
                      You assume all legal liability. <span className="text-destructive font-medium">Requires legal disclaimer acceptance.</span>
                    </p>
                  </div>
                  {getCurrentMode() === 'never' && (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Disclosure Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder={DEFAULT_MESSAGE}
              value={settings.recording_disclosure_message}
              onChange={(e) => setSettings({ ...settings, recording_disclosure_message: e.target.value })}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default message. Message will be spoken in a professional voice.
            </p>
          </div>

          {/* Two-Party Consent States Info */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Two-Party Consent States</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>The following states require all parties to consent to recording:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {TWO_PARTY_CONSENT_STATES.map(state => (
                  <Badge key={state.code} variant="outline">
                    {state.name} ({state.code})
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>

          {/* Compliance Warning */}
          {settings.never_announce_recording && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>⚠️ Legal Compliance Warning - Disclaimer Accepted</AlertTitle>
              <AlertDescription>
                Recording disclosure is DISABLED. You have accepted full legal responsibility for compliance
                with federal and state recording consent laws. This decision has been logged with your IP address
                and timestamp. Violations can result in criminal charges, civil liability, and fines up to $5,000
                per violation.
              </AlertDescription>
            </Alert>
          )}

          {/* Compliance Statistics */}
          {complianceStats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Last 30 Days Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Calls</p>
                    <p className="font-medium">{complianceStats.total_calls || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Compliance Rate</p>
                    <p className="font-medium">{complianceStats.compliance_rate || 100}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Calls with Disclosure</p>
                    <p className="font-medium">{complianceStats.calls_with_disclosure || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Two-Party State Calls</p>
                    <p className="font-medium">{complianceStats.two_party_state_calls || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Disclaimer Modal */}
      <LegalDisclaimerModal
        open={showLegalDisclaimer}
        onOpenChange={setShowLegalDisclaimer}
        onAccept={handleDisclaimerAccept}
        disclaimerAccepted={disclaimerAccepted}
        setDisclaimerAccepted={setDisclaimerAccepted}
        userEmail={userEmail}
      />
    </div>
  );
}

// Legal Disclaimer Text
const LEGAL_DISCLAIMER_TEXT = `
By disabling recording disclosure announcements, you acknowledge and agree to the following:

1. LEGAL RESPONSIBILITY: You assume FULL legal responsibility for compliance with all applicable federal, state, and local laws regarding call recording consent, including but not limited to two-party consent requirements.

2. CRIMINAL LIABILITY: You understand that unauthorized recording of phone calls may constitute a criminal offense punishable by fines and imprisonment in certain jurisdictions.

3. CIVIL LIABILITY: You may be subject to civil lawsuits and damages for recording calls without proper consent.

4. INDEMNIFICATION: You agree to indemnify, defend, and hold harmless LoadVoice, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your decision to disable recording disclosures.

5. NO LEGAL ADVICE: LoadVoice does not provide legal advice. You are strongly encouraged to consult with qualified legal counsel regarding recording consent requirements in your jurisdiction.

6. AUDIT TRAIL: This decision will be permanently logged with your user information, IP address, and timestamp for legal compliance purposes.

7. IMMEDIATE EFFECT: Disabling recording disclosure takes effect immediately and applies to all future calls.
`;

// Legal Disclaimer Modal Component
function LegalDisclaimerModal({
  open,
  onOpenChange,
  onAccept,
  disclaimerAccepted,
  setDisclaimerAccepted,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  disclaimerAccepted: boolean;
  setDisclaimerAccepted: (accepted: boolean) => void;
  userEmail: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Legal Disclaimer - Recording Without Disclosure
          </DialogTitle>
          <DialogDescription>
            You are about to disable recording disclosure announcements. This action has serious legal implications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Recording calls without proper disclosure is ILLEGAL in many jurisdictions and can result in
              criminal prosecution and civil lawsuits.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
              {LEGAL_DISCLAIMER_TEXT}
            </pre>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">By proceeding, you confirm:</p>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="accept"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked as boolean)}
              />
              <label htmlFor="accept" className="text-sm leading-relaxed">
                I, {userEmail || 'the authorized user'}, have read, understood, and agree to the above terms.
                I accept full legal responsibility for disabling recording disclosures and will indemnify
                LoadVoice from any resulting claims or damages. I understand this decision is logged and permanent.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel (Keep Disclosure Enabled)
          </Button>
          <Button
            variant="destructive"
            onClick={onAccept}
            disabled={!disclaimerAccepted}
          >
            I Accept Legal Responsibility
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}