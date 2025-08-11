# BuildAI Call Tracking - Database Schema

This document describes the Supabase (PostgreSQL) database schema used by the BuildAI Call Tracking application.

## Tables

### companies

Stores information about companies targeted for BuildAI event outreach.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamp | Timestamp of creation |
| name | text | Company name |
| status | text | Status of the company outreach ('not_started', 'in_progress', 'signed_up', 'not_interested') |
| assigned_to | text | Name of the caller assigned to this company |
| priority | text | Priority level ('high', 'medium', 'low') |
| num_buildings | integer | Number of buildings owned by the company |
| account_manager | text | Name of the account manager |
| sales_rep | text | Name of the sales representative |

### contacts

Stores information about contacts at companies.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamp | Timestamp of creation |
| company_id | uuid | Foreign key reference to companies.id |
| name | text | Contact name |
| title | text | Job title |
| phone | text | Office phone number |
| mobile | text | Mobile phone number |
| email | text | Email address |

### calls

Records call interactions with contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamp | Timestamp of creation |
| company_id | uuid | Foreign key reference to companies.id |
| contact_id | uuid | Foreign key reference to contacts.id |
| caller_name | text | Name of the caller who made the call |
| outcome | text | Outcome of the call ('reached_interested', 'reached_not_interested', 'reached_callback', 'no_answer', 'left_voicemail', 'wrong_number', 'busy') |
| notes | text | Additional notes from the call |
| follow_up_date | date | Date for follow-up if needed |

### signups

Records successful signups for the BuildAI event.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamp | Timestamp of creation |
| company_id | uuid | Foreign key reference to companies.id |
| contact_id | uuid | Foreign key reference to contacts.id |
| caller_name | text | Name of the caller who secured the signup |
| expected_attendees | integer | Number of expected attendees |
| special_requirements | text | Any special requirements (dietary, accessibility, etc.) |
| notes | text | Additional notes |

## Indexes

For optimal performance, the following indexes are recommended:

1. Index on `companies.assigned_to` for quick filtering of companies by caller
2. Index on `contacts.company_id` for fast retrieval of company contacts
3. Index on `calls.company_id` and `calls.contact_id` for call history lookups
4. Index on `signups.company_id` and `signups.contact_id` for signup information retrieval
5. Index on `calls.caller_name` and `signups.caller_name` for caller statistics

## Table Relationships

- `contacts` has a many-to-one relationship with `companies`
- `calls` has a many-to-one relationship with both `companies` and `contacts`
- `signups` has a many-to-one relationship with both `companies` and `contacts`

## Database Setup SQL

```sql
-- Create companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  num_buildings INTEGER DEFAULT 0,
  account_manager TEXT,
  sales_rep TEXT
);

-- Create contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT
);

-- Create calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  outcome TEXT NOT NULL,
  notes TEXT,
  follow_up_date DATE
);

-- Create signups table
CREATE TABLE signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  expected_attendees INTEGER NOT NULL DEFAULT 1,
  special_requirements TEXT,
  notes TEXT
);

-- Create recommended indexes
CREATE INDEX idx_companies_assigned_to ON companies(assigned_to);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_calls_company_id ON calls(company_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_caller_name ON calls(caller_name);
CREATE INDEX idx_signups_company_id ON signups(company_id);
CREATE INDEX idx_signups_contact_id ON signups(contact_id);
CREATE INDEX idx_signups_caller_name ON signups(caller_name);
```
