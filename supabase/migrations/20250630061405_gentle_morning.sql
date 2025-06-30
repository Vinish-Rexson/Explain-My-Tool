/*
  # Fix User Profile Creation

  1. Database Functions
    - Create or update the `handle_new_user` function to properly create user profiles
    - Ensure the function handles both Google OAuth and email signups
    
  2. Triggers
    - Create trigger to automatically create profile when user signs up
    - Handle user metadata from OAuth providers
    
  3. Security
    - Ensure RLS policies allow profile creation during signup
    - Add proper error handling
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, subscription_tier)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'free'
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update it instead
    UPDATE public.profiles 
    SET 
      email = new.email,
      full_name = COALESCE(
        profiles.full_name, 
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'name', 
        split_part(new.email, '@', 1)
      ),
      avatar_url = COALESCE(profiles.avatar_url, new.raw_user_meta_data->>'avatar_url'),
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    -- Allow system to create profiles during user creation
    current_setting('role') = 'service_role'
  );

-- Ensure the profiles table has proper constraints
ALTER TABLE profiles 
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);