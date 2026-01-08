-- Add welcome settings to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Welcome to FortunesHQ! 🎉 Get ready to play and win!',
ADD COLUMN IF NOT EXISTS welcome_bonus_amount INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS welcome_bonus_limit INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS welcome_bonus_enabled BOOLEAN DEFAULT true;

-- Create email campaigns table for admin communications
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'active', 'inactive', 'kyc_verified', 'high_value', 'new_users'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email campaign recipients log
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view campaign recipients" ON public.email_campaign_recipients
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for campaign lookups
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);