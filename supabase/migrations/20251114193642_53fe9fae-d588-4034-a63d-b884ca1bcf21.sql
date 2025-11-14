-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('user', 'moderator');

-- Create enum for news status
CREATE TYPE public.news_status AS ENUM ('pending', 'verified_true', 'verified_fake');

-- Create enum for verdict
CREATE TYPE public.verdict_type AS ENUM ('true', 'fake');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  trust_score INTEGER DEFAULT 0 NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create news_reports table
CREATE TABLE public.news_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status news_status DEFAULT 'pending' NOT NULL,
  suspicion_score INTEGER DEFAULT 0,
  final_verdict verdict_type,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES public.news_reports(id) ON DELETE CASCADE NOT NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  verdict verdict_type NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(news_id, verified_by)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "News reports are viewable by everyone"
  ON public.news_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON public.news_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Moderators can update reports"
  ON public.news_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'moderator'
    )
  );

CREATE POLICY "Verifications are viewable by everyone"
  ON public.verifications FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create verifications"
  ON public.verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = verified_by);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trust_score, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    0,
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_reports_updated_at
  BEFORE UPDATE ON public.news_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();