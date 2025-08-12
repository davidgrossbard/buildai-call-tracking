-- Add metadata columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS num_buildings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_manager TEXT,
ADD COLUMN IF NOT EXISTS sales_rep TEXT,
ADD COLUMN IF NOT EXISTS sales_status TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add an index on assigned_to for better performance
CREATE INDEX IF NOT EXISTS idx_companies_assigned_to ON companies(assigned_to);

-- Add an index on status for better performance
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Add notes column to contacts if it doesn't exist
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Update the companies table comment
COMMENT ON TABLE companies IS 'Companies table with extended metadata for BuildAI event tracking';

-- Add column comments
COMMENT ON COLUMN companies.num_buildings IS 'Number of buildings managed by the company';
COMMENT ON COLUMN companies.account_manager IS 'Account manager assigned from BuildAI team';
COMMENT ON COLUMN companies.sales_rep IS 'Sales representative assigned from BuildAI team';
COMMENT ON COLUMN companies.sales_status IS 'Sales pipeline status (active, prospect, etc.)';
COMMENT ON COLUMN companies.address IS 'Company office or mailing address';
COMMENT ON COLUMN companies.notes IS 'Additional notes about the company';