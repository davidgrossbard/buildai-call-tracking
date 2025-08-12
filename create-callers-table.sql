-- Create callers table
CREATE TABLE IF NOT EXISTS callers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create an index on active status for faster queries
CREATE INDEX IF NOT EXISTS idx_callers_is_active ON callers(is_active);

-- Insert the current callers
INSERT INTO callers (name, email) VALUES
  ('Becca Sitorsky', 'becca@buildai.com'),
  ('Cindy Frank', 'cindy@buildai.com'),
  ('Daniel Burg', 'daniel@buildai.com'),
  ('Henny Margulies', 'henny@buildai.com'),
  ('Laura Bendayan', 'laura@buildai.com'),
  ('Nicole Owsianka', 'nicole@buildai.com'),
  ('Nikki Mandelbaum', 'nikki@buildai.com'),
  ('Sarah Epstein', 'sarah@buildai.com'),
  ('Sherri Weinman', 'sherri@buildai.com'),
  ('Eric Soloff', 'eric@buildai.com'),
  ('Simon Soloff', 'simon@buildai.com')
ON CONFLICT (email) DO NOTHING;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_callers_updated_at BEFORE UPDATE
    ON callers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) if needed
ALTER TABLE callers ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (adjust as needed)
CREATE POLICY "Enable all operations for callers" ON callers
    FOR ALL USING (true);