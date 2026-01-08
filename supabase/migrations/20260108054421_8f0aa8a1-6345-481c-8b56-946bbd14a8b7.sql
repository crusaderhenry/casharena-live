-- Create email_templates table for admin-managed transactional emails
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  placeholders JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view templates (for edge functions)
CREATE POLICY "Anyone can view email templates"
ON public.email_templates
FOR SELECT
USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, subject, body, description, placeholders) VALUES
(
  'welcome_bonus',
  'Welcome Bonus',
  'Your ₦{{amount}} Welcome Bonus is Ready! 🎉',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a2e;">
<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Welcome to FortunesHQ!</h1>
</div>
<div style="padding:30px;color:#e0e0e0;">
<p style="font-size:16px;">Hi <strong>{{username}}</strong>,</p>
<p style="font-size:16px;">We''re thrilled to have you join the FortunesHQ family! To get you started, we''ve credited your wallet with a special welcome bonus:</p>
<div style="text-align:center;margin:30px 0;padding:20px;background:#0f0f23;border-radius:12px;">
<span style="font-size:48px;font-weight:bold;color:#22c55e;">₦{{amount}}</span>
</div>
<p style="font-size:16px;">Use this bonus to join exciting games and start winning real cash prizes!</p>
<div style="text-align:center;margin:30px 0;">
<a href="{{app_url}}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Start Playing Now</a>
</div>
<p style="font-size:14px;color:#888;">Good luck and have fun!</p>
</div>
<div style="padding:20px;text-align:center;border-top:1px solid #333;color:#666;font-size:12px;">
<p>© 2025 FortunesHQ. All rights reserved.</p>
</div>
</div>
</body>
</html>',
  'Sent when a new user receives their welcome bonus',
  '["username", "amount", "app_url"]'::jsonb
),
(
  'withdrawal_complete',
  'Withdrawal Successful',
  'Withdrawal of ₦{{amount}} Successful ✅',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a2e;">
<div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Withdrawal Successful!</h1>
</div>
<div style="padding:30px;color:#e0e0e0;">
<p style="font-size:16px;">Hi <strong>{{username}}</strong>,</p>
<p style="font-size:16px;">Great news! Your withdrawal has been processed successfully.</p>
<div style="background:#0f0f23;border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#888;">Amount:</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#22c55e;font-size:20px;">₦{{amount}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Reference:</td><td style="padding:10px 0;text-align:right;font-family:monospace;">{{reference}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Bank:</td><td style="padding:10px 0;text-align:right;">{{bank_name}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Account:</td><td style="padding:10px 0;text-align:right;">{{account_number}}</td></tr>
</table>
</div>
<p style="font-size:14px;color:#888;">The funds should reflect in your bank account shortly.</p>
</div>
<div style="padding:20px;text-align:center;border-top:1px solid #333;color:#666;font-size:12px;">
<p>© 2025 FortunesHQ. All rights reserved.</p>
</div>
</div>
</body>
</html>',
  'Sent when a withdrawal is completed successfully',
  '["username", "amount", "reference", "bank_name", "account_number"]'::jsonb
),
(
  'withdrawal_failed',
  'Withdrawal Failed',
  'Withdrawal of ₦{{amount}} Failed ❌',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a2e;">
<div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:40px;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Withdrawal Failed</h1>
</div>
<div style="padding:30px;color:#e0e0e0;">
<p style="font-size:16px;">Hi <strong>{{username}}</strong>,</p>
<p style="font-size:16px;">Unfortunately, your withdrawal request could not be processed.</p>
<div style="background:#0f0f23;border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#888;">Amount:</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#ef4444;font-size:20px;">₦{{amount}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Reference:</td><td style="padding:10px 0;text-align:right;font-family:monospace;">{{reference}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Reason:</td><td style="padding:10px 0;text-align:right;color:#ef4444;">{{reason}}</td></tr>
</table>
</div>
<p style="font-size:16px;">The amount has been refunded to your wallet. Please try again or contact support if the issue persists.</p>
<div style="text-align:center;margin:30px 0;">
<a href="{{app_url}}/wallet" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Go to Wallet</a>
</div>
</div>
<div style="padding:20px;text-align:center;border-top:1px solid #333;color:#666;font-size:12px;">
<p>© 2025 FortunesHQ. All rights reserved.</p>
</div>
</div>
</body>
</html>',
  'Sent when a withdrawal fails and funds are refunded',
  '["username", "amount", "reference", "reason", "app_url"]'::jsonb
),
(
  'game_cancelled_refund',
  'Game Cancelled - Refund',
  'Game Cancelled - ₦{{amount}} Refunded 🔄',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a2e;">
<div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Game Cancelled</h1>
</div>
<div style="padding:30px;color:#e0e0e0;">
<p style="font-size:16px;">Hi <strong>{{username}}</strong>,</p>
<p style="font-size:16px;">The game <strong>{{game_name}}</strong> has been cancelled due to insufficient participants.</p>
<div style="background:#0f0f23;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="color:#888;margin:0 0 10px 0;">Your entry fee has been refunded:</p>
<span style="font-size:36px;font-weight:bold;color:#22c55e;">₦{{amount}}</span>
</div>
<p style="font-size:16px;">Don''t worry! There are always more games to join. Check out the arena for upcoming games.</p>
<div style="text-align:center;margin:30px 0;">
<a href="{{app_url}}/arena" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Browse Games</a>
</div>
</div>
<div style="padding:20px;text-align:center;border-top:1px solid #333;color:#666;font-size:12px;">
<p>© 2025 FortunesHQ. All rights reserved.</p>
</div>
</div>
</body>
</html>',
  'Sent when a game is cancelled and entry fee is refunded',
  '["username", "game_name", "amount", "app_url"]'::jsonb
),
(
  'kyc_verified',
  'KYC Verification Complete',
  'Your Identity is Verified! ✅',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a2e;">
<div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Identity Verified!</h1>
</div>
<div style="padding:30px;color:#e0e0e0;">
<p style="font-size:16px;">Hi <strong>{{username}}</strong>,</p>
<p style="font-size:16px;">Great news! Your KYC verification has been completed successfully.</p>
<div style="background:#0f0f23;border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;color:#888;">Name:</td><td style="padding:10px 0;text-align:right;font-weight:bold;">{{first_name}} {{last_name}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Verification Type:</td><td style="padding:10px 0;text-align:right;">{{kyc_type}}</td></tr>
<tr><td style="padding:10px 0;color:#888;">Status:</td><td style="padding:10px 0;text-align:right;color:#22c55e;font-weight:bold;">✓ Verified</td></tr>
</table>
</div>
<p style="font-size:16px;">You now have full access to all features including withdrawals. Start winning and cashing out!</p>
<div style="text-align:center;margin:30px 0;">
<a href="{{app_url}}/wallet" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Go to Wallet</a>
</div>
</div>
<div style="padding:20px;text-align:center;border-top:1px solid #333;color:#666;font-size:12px;">
<p>© 2025 FortunesHQ. All rights reserved.</p>
</div>
</div>
</body>
</html>',
  'Sent when KYC verification is completed successfully',
  '["username", "first_name", "last_name", "kyc_type", "app_url"]'::jsonb
);

-- Create email_logs table to track sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert logs
CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (false);