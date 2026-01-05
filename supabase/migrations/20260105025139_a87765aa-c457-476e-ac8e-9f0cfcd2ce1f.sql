-- Strengthen profiles table security: require authentication explicitly
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
CREATE POLICY "Users can view own full profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Strengthen wallet_transactions security: require authentication explicitly  
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" 
ON public.wallet_transactions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);