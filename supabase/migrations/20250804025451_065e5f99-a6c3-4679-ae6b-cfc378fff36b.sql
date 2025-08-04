-- Create atomic_swaps table for testnet swap tracking
CREATE TABLE public.atomic_swaps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    from_token TEXT NOT NULL,
    to_token TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    recipient_address TEXT NOT NULL,
    timelock_duration INTEGER NOT NULL,
    hashlock TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    progress INTEGER NOT NULL DEFAULT 0,
    eth_tx_hash TEXT,
    cosmos_tx_hash TEXT,
    completion_proof JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    direction TEXT CHECK (direction IN ('eth-to-cosmos', 'cosmos-to-eth'))
);

-- Enable Row Level Security
ALTER TABLE public.atomic_swaps ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for demo purposes)
CREATE POLICY "Anyone can view atomic swaps" 
ON public.atomic_swaps 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create atomic swaps" 
ON public.atomic_swaps 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update atomic swaps" 
ON public.atomic_swaps 
FOR UPDATE 
USING (true);

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

-- Create indexes for better performance
CREATE INDEX idx_atomic_swaps_status ON public.atomic_swaps(status);
CREATE INDEX idx_atomic_swaps_created_at ON public.atomic_swaps(created_at);
CREATE INDEX idx_atomic_swaps_eth_tx_hash ON public.atomic_swaps(eth_tx_hash);
CREATE INDEX idx_atomic_swaps_cosmos_tx_hash ON public.atomic_swaps(cosmos_tx_hash);