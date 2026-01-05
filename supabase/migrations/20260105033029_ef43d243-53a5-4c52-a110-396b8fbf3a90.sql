-- Platform settings table for global configuration including Test Mode
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_mode boolean NOT NULL DEFAULT true,
  platform_name text NOT NULL DEFAULT 'FortunesHQ',
  platform_cut_percent integer NOT NULL DEFAULT 10,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.platform_settings (id, test_mode, platform_name, platform_cut_percent)
VALUES ('00000000-0000-0000-0000-000000000001', true, 'FortunesHQ', 10);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only admins can update platform settings
CREATE POLICY "Admins can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment provider logs table for audit trail
CREATE TABLE public.payment_provider_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'paystack',
  reference text NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_provider_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all payment logs
CREATE POLICY "Admins can view payment logs"
ON public.payment_provider_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert payment logs
CREATE POLICY "Service role can insert payment logs"
ON public.payment_provider_logs
FOR INSERT
WITH CHECK (false);

-- Extend wallet_transactions with new columns
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS reference text,
ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'test',
ADD COLUMN IF NOT EXISTS provider_reference text;

-- Extend profiles with wallet lock and bank details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_code text;

-- Create index for transaction lookups by reference
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference);

-- Create index for payment logs by reference
CREATE INDEX IF NOT EXISTS idx_payment_provider_logs_reference ON public.payment_provider_logs(reference);

-- Add trigger for platform_settings updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();