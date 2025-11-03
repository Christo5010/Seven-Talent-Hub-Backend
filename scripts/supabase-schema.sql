-- Seven Talent Hub - Supabase Database Schema with Auth Integration
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (Connected to auth.users)
-- ============================================
-- This table is automatically linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'user_sourcing', 'user_7options', 'watcheur')),
  phone TEXT,
  address TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT true,
  client_id UUID,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONSULTANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  role TEXT,
  company TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  years_of_experience INTEGER DEFAULT 0,
  commercial_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  availability JSONB DEFAULT '{"status": "available", "date": null}'::jsonb,
  cv_file_url TEXT,
  templated_cv_url TEXT,
  price DECIMAL(10, 2),
  english_level TEXT,
  is_permifier BOOLEAN DEFAULT false,
  is_relocatable BOOLEAN DEFAULT false,
  nationality TEXT,
  age INTEGER,
  is_seven_academy BOOLEAN DEFAULT false,
  seven_academy_training JSONB,
  is_favorite BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  blacklist_date TIMESTAMPTZ,
  next_followup TIMESTAMPTZ,
  color TEXT,
  experiences JSONB DEFAULT '[]'::jsonb,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for consultants
CREATE INDEX IF NOT EXISTS idx_consultants_commercial_id ON consultants(commercial_id);
CREATE INDEX IF NOT EXISTS idx_consultants_created_by ON consultants(created_by);
CREATE INDEX IF NOT EXISTS idx_consultants_is_favorite ON consultants(is_favorite);
CREATE INDEX IF NOT EXISTS idx_consultants_is_blacklisted ON consultants(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_consultants_tags ON consultants USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_consultants_availability ON consultants USING GIN(availability);
CREATE INDEX IF NOT EXISTS idx_consultants_created_at ON consultants(created_at DESC);

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('company', 'individual')),
  category TEXT DEFAULT 'seven_opportunity' CHECK (category IN ('seven_opportunity', 'seven_options')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Prospect',
  commercials JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  role TEXT,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT company_individual_check CHECK (
    (type = 'company' AND company_id IS NULL) OR 
    (type = 'individual')
  )
);

-- Create indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_category ON clients(category);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_commercials ON clients USING GIN(commercials);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('create', 'update', 'delete', 'note', 'call', 'email', 'todo', 'comment', 'interaction', 'placement', 'end_of_mission_alert')),
  user TEXT NOT NULL,
  content TEXT,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  consultant_name TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  interaction_type TEXT,
  assigner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  details JSONB
);

-- Create indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_consultant_id ON activities(consultant_id);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_assignee_id ON activities(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('assignment', 'availability', 'comment', 'call', 'email', 'todo', 'end_of_mission_alert')),
  message TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('consultant', 'client')),
  entity_id UUID,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultants_updated_at BEFORE UPDATE ON consultants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Service role bypasses RLS (backend uses service role)
-- All operations through backend are allowed

-- Consultants Policies
CREATE POLICY "Authenticated users can view consultants" ON consultants
    FOR SELECT USING (auth.role() = 'authenticated');

-- Clients Policies
CREATE POLICY "Authenticated users can view clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

-- Activities Policies
CREATE POLICY "Authenticated users can view activities" ON activities
    FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- ============================================
-- HELPFUL FUNCTIONS
-- ============================================

-- Function to get user profile with role
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  username TEXT,
  role TEXT,
  phone TEXT,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    p.username,
    p.role,
    p.phone,
    p.active
  FROM profiles p
  WHERE p.id = user_id AND p.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NOTES
-- ============================================
-- 1. Profiles are automatically created when a user signs up via Supabase Auth
-- 2. The trigger on_auth_user_created handles profile creation
-- 3. Service role key bypasses RLS - backend operations work seamlessly
-- 4. Users authenticate via Supabase Auth, then backend fetches profile
-- 5. Remember to create storage buckets: 'avatars' and 'consultant-cvs'
