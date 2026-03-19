ALTER TABLE public.leads ADD COLUMN current_provider text;
ALTER TABLE public.leads ADD COLUMN provider_type text;
ALTER TABLE public.leads ADD COLUMN provider_confidence text;
ALTER TABLE public.leads ADD COLUMN competitor_detected_at timestamptz;
ALTER TABLE public.leads ADD COLUMN competitor_source text;
ALTER TABLE public.leads ADD COLUMN displacement_difficulty text;