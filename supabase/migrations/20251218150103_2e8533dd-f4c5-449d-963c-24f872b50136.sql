-- Add reviewer role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'reviewer';

-- Create paper_reviews table
CREATE TABLE public.paper_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES public.research_papers(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  methodology_rating INTEGER CHECK (methodology_rating >= 1 AND methodology_rating <= 5),
  originality_rating INTEGER CHECK (originality_rating >= 1 AND originality_rating <= 5),
  clarity_rating INTEGER CHECK (clarity_rating >= 1 AND clarity_rating <= 5),
  feedback TEXT NOT NULL,
  decision VARCHAR(20) CHECK (decision IN ('approve', 'reject', 'revision')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on paper_reviews
ALTER TABLE public.paper_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for paper_reviews
CREATE POLICY "Reviewers can view their own reviews" ON public.paper_reviews
FOR SELECT USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can insert reviews" ON public.paper_reviews
FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews" ON public.paper_reviews
FOR UPDATE USING (auth.uid() = reviewer_id);

-- Create documentaries table
CREATE TABLE public.documentaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  researcher_id UUID REFERENCES public.profiles(user_id),
  uploaded_by UUID NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on documentaries
ALTER TABLE public.documentaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for documentaries (public read, admin write)
CREATE POLICY "Anyone can view documentaries" ON public.documentaries
FOR SELECT USING (true);

CREATE POLICY "Admins can insert documentaries" ON public.documentaries
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documentaries" ON public.documentaries
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documentaries" ON public.documentaries
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for paper_reviews
CREATE TRIGGER update_paper_reviews_updated_at
BEFORE UPDATE ON public.paper_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for documentaries
CREATE TRIGGER update_documentaries_updated_at
BEFORE UPDATE ON public.documentaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create documentaries storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documentaries', 'documentaries', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentaries bucket
CREATE POLICY "Anyone can view documentary videos" ON storage.objects
FOR SELECT USING (bucket_id = 'documentaries');

CREATE POLICY "Admins can upload documentary videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documentaries' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documentary videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'documentaries' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documentary videos" ON storage.objects
FOR DELETE USING (bucket_id = 'documentaries' AND public.has_role(auth.uid(), 'admin'));