-- =====================================================
-- OVERAGE DEBT TRACKING
-- Tracks unpaid overage amounts that must be collected
-- =====================================================

-- Add overage debt tracking to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS overage_debt DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS overage_debt_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS has_unpaid_overage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_upgrade BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_overage_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS overage_payment_status TEXT DEFAULT 'none' CHECK (overage_payment_status IN ('none', 'pending', 'invoice_sent', 'paid', 'failed'));

-- Create overage invoices table
CREATE TABLE IF NOT EXISTS public.overage_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Invoice details
  amount DECIMAL(10,2) NOT NULL,
  minutes_overage INTEGER NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Paddle integration
  paddle_invoice_id TEXT,
  paddle_transaction_id TEXT,
  paddle_checkout_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_period_invoice UNIQUE (organization_id, billing_period_start, billing_period_end)
);

-- Create index for fast lookups
CREATE INDEX idx_overage_invoices_org ON public.overage_invoices(organization_id);
CREATE INDEX idx_overage_invoices_status ON public.overage_invoices(status);

-- Enable RLS
ALTER TABLE public.overage_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Organizations can view their own invoices
CREATE POLICY "Organizations view own invoices" ON public.overage_invoices
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTION: Calculate and create overage invoice
-- Run at end of billing period
-- =====================================================
CREATE OR REPLACE FUNCTION create_overage_invoice(
  p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_overage_minutes INTEGER;
  v_overage_amount DECIMAL(10,2);
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get organization's current overage
  SELECT
    GREATEST(0, usage_minutes_current - usage_minutes_limit),
    GREATEST(0, usage_minutes_current - usage_minutes_limit) * 0.20,
    COALESCE(DATE(usage_reset_date - INTERVAL '1 month'), CURRENT_DATE - INTERVAL '1 month'),
    COALESCE(DATE(usage_reset_date), CURRENT_DATE)
  INTO v_overage_minutes, v_overage_amount, v_period_start, v_period_end
  FROM public.organizations
  WHERE id = p_organization_id;

  -- Only create invoice if there's overage
  IF v_overage_amount > 0 THEN
    -- Create invoice
    INSERT INTO public.overage_invoices (
      organization_id,
      amount,
      minutes_overage,
      billing_period_start,
      billing_period_end,
      status
    ) VALUES (
      p_organization_id,
      v_overage_amount,
      v_overage_minutes,
      v_period_start,
      v_period_end,
      'pending'
    )
    RETURNING id INTO v_invoice_id;

    -- Update organization with debt
    UPDATE public.organizations
    SET
      overage_debt = v_overage_amount,
      overage_debt_due_date = NOW() + INTERVAL '7 days',
      has_unpaid_overage = true,
      can_upgrade = false, -- Block upgrades until paid
      last_overage_invoice_id = v_invoice_id::TEXT,
      overage_payment_status = 'pending'
    WHERE id = p_organization_id;

    -- Log for audit
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
      p_organization_id, -- Using org id as user for system actions
      'overage_invoice_created',
      'overage_invoice',
      v_invoice_id,
      jsonb_build_object(
        'amount', v_overage_amount,
        'minutes', v_overage_minutes,
        'period_start', v_period_start,
        'period_end', v_period_end
      )
    );
  END IF;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Mark overage as paid
-- =====================================================
CREATE OR REPLACE FUNCTION mark_overage_paid(
  p_invoice_id UUID,
  p_paddle_transaction_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_amount DECIMAL(10,2);
BEGIN
  -- Get invoice details
  SELECT organization_id, amount
  INTO v_organization_id, v_amount
  FROM public.overage_invoices
  WHERE id = p_invoice_id;

  IF v_organization_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update invoice
  UPDATE public.overage_invoices
  SET
    status = 'paid',
    paid_at = NOW(),
    paddle_transaction_id = p_paddle_transaction_id,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- Clear organization debt
  UPDATE public.organizations
  SET
    overage_debt = 0,
    has_unpaid_overage = false,
    can_upgrade = true, -- Allow upgrades again
    overage_payment_status = 'paid'
  WHERE id = v_organization_id;

  -- Log payment
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    v_organization_id,
    'overage_payment_received',
    'overage_invoice',
    p_invoice_id,
    jsonb_build_object(
      'amount', v_amount,
      'paddle_transaction_id', p_paddle_transaction_id
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_overage_invoice TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overage_paid TO authenticated;

-- =====================================================
-- TRIGGER: Block operations if overage unpaid
-- =====================================================
CREATE OR REPLACE FUNCTION check_overage_debt_before_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if organization has unpaid overage
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = NEW.organization_id
    AND has_unpaid_overage = true
    AND overage_debt > 0
  ) THEN
    RAISE EXCEPTION 'Cannot perform operation: Unpaid overage debt must be settled first';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables (optional - decide where to enforce)
-- Example: Block new team members if overage unpaid
-- CREATE TRIGGER check_overage_before_invite
--   BEFORE INSERT ON public.user_organizations
--   FOR EACH ROW
--   EXECUTE FUNCTION check_overage_debt_before_operation();