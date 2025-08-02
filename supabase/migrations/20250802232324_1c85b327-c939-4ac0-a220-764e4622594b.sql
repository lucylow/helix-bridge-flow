-- Create atomic_swaps table to store swap history and status
CREATE TABLE public.atomic_swaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  recipient_address TEXT NOT NULL,
  timelock_duration INTEGER NOT NULL,
  hashlock TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'eth-locked', 'atom-locked', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  eth_tx_hash TEXT,
  cosmos_tx_hash TEXT,
  completion_proof JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.atomic_swaps ENABLE ROW LEVEL SECURITY;

-- Create policies for atomic swaps
CREATE POLICY "Users can view their own swaps" 
ON public.atomic_swaps 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own swaps" 
ON public.atomic_swaps 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own swaps" 
ON public.atomic_swaps 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_atomic_swaps_updated_at
BEFORE UPDATE ON public.atomic_swaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_atomic_swaps_user_id ON public.atomic_swaps(user_id);
CREATE INDEX idx_atomic_swaps_status ON public.atomic_swaps(status);
CREATE INDEX idx_atomic_swaps_created_at ON public.atomic_swaps(created_at DESC);