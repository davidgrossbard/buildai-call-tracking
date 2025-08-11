# BuildAI Call Tracker - Complete Setup & Deployment Guide

## Part 1: Supabase Setup (15-20 minutes)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" (it's free)
3. Sign up with GitHub or email
4. Create a new project:
   - **Project name**: BuildAI-Tracker
   - **Database Password**: Generate a strong password (save it but you won't need it for the app)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine
5. Wait 2-3 minutes for project to initialize

### Step 2: Create Database Tables
1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste this ENTIRE SQL block:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  num_buildings INTEGER DEFAULT 0,
  account_manager TEXT,
  sales_rep TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table
CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  outcome TEXT NOT NULL,
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signups table
CREATE TABLE signups (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  expected_attendees INTEGER DEFAULT 1,
  special_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_companies_assigned_to ON companies(assigned_to);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_calls_company_id ON calls(company_id);
CREATE INDEX idx_calls_caller_name ON calls(caller_name);
CREATE INDEX idx_signups_company_id ON signups(company_id);
CREATE INDEX idx_signups_caller_name ON signups(caller_name);

-- Enable Row Level Security (but allow all access for now)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (no auth required)
CREATE POLICY "Enable all access for companies" ON companies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for calls" ON calls
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for signups" ON signups
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE signups;
```

4. Click **Run** (bottom right)
5. You should see "Success. No rows returned"

### Step 3: Get Your API Credentials
1. In Supabase dashboard, click **Settings** (gear icon, left sidebar)
2. Click **API**
3. Copy these two values:
   - **Project URL**: Looks like `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

### Step 4: Update Your Local Files
1. Create a `.env` file in your project folder:
```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```
2. Replace the values with your actual credentials from Step 3

## Part 2: Deploy to Vercel (10 minutes)

### Option A: Deploy with Vercel CLI (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Create a simple project structure**:
```bash
# In your BuildAI CallTracking folder
mkdir build
cp App.jsx build/index.jsx
```

3. **Create an index.html file**:
Create `build/index.html` with this content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BuildAI Event Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="./index.jsx"></script>
  <script type="text/babel">
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
```

4. **Deploy to Vercel**:
```bash
cd build
vercel
```
- Follow the prompts (create new project, accept defaults)
- When asked about environment variables, add:
  - `REACT_APP_SUPABASE_URL` = your-url
  - `REACT_APP_SUPABASE_ANON_KEY` = your-key

### Option B: Deploy with GitHub + Vercel

1. **Create a GitHub repository**
2. **Push your code**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

3. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables:
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`
   - Click "Deploy"

### Option C: Quick Deploy with Netlify

1. **Create a build folder** with index.html (same as Option A step 3)
2. **Go to [netlify.com](https://netlify.com)**
3. **Drag and drop** your build folder onto the Netlify dashboard
4. **Set environment variables**:
   - Go to Site Settings > Environment Variables
   - Add your Supabase credentials

## Part 3: Upload Your CSV Data

1. **Open your deployed app** (Vercel/Netlify will give you a URL)
2. **Click "Upload CSV"** button
3. **Select your CSV file** ("Build AI Invite - Master List (2).csv")
4. Wait for "Successfully imported X companies!" message
5. **Data is now live!**

## Part 4: Share with Your Team

Send your team:
1. **The app URL**: `https://your-app.vercel.app`
2. **Instructions**: "Select your name from the dropdown and start calling!"

## Quick Deployment Checklist

- [ ] Supabase account created
- [ ] Database tables created with SQL
- [ ] API credentials copied
- [ ] Environment variables set
- [ ] App deployed to Vercel/Netlify
- [ ] CSV data uploaded
- [ ] Team notified with URL

## Troubleshooting

**"Connection Error" in the app?**
- Check that environment variables are set correctly in Vercel/Netlify
- Make sure Supabase project is active (not paused)
- Verify the API credentials are correct

**CSV upload not working?**
- Ensure CSV headers match exactly: Company, First, Last, Title, Phone, Mobile, Email, NumOfBuildings
- Check browser console (F12) for specific errors

**App not loading?**
- Clear browser cache
- Check that all environment variables are set in deployment platform
- Verify Supabase tables were created successfully

## Total Time: ~30 minutes

Your app will be live and ready for your team to use!