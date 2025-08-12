# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildAI Call Tracking is a React-based web application designed to manage outreach efforts for the BuildAI event on September 10th. It provides a comprehensive CRM-like system for tracking companies, contacts, calls, and event signups.

### Project Background
- Originally developed as a rapid solution for coordinating 15 callers reaching out to potential attendees
- Prioritized simplicity and ease of setup - no authentication required by design
- Supabase was chosen over Firebase for its simpler setup with anonymous access
- Built to handle real-time coordination between multiple simultaneous users

## Tech Stack

- **Frontend**: React with Tailwind CSS for styling
- **Backend**: Supabase (PostgreSQL database with realtime subscriptions)
- **Icons**: Lucide React
- **Database Client**: @supabase/supabase-js

## Commands

Since no package.json exists, this appears to be a standalone React application meant to be run directly in the browser or built with external tooling:

```bash
# No npm/yarn commands available - project uses CDN imports or external build setup
# To run locally, open index.html in a browser or serve with:
python -m http.server 8000
# or
npx serve .
```

## Architecture

### Database Schema (Supabase/PostgreSQL)

The application uses 4 main tables:

1. **companies** - Stores company information with fields for status tracking, assignment, priority, and metadata
2. **contacts** - Contact information linked to companies  
3. **calls** - Call records with outcomes and notes
4. **signups** - Event signup tracking with attendee counts

All tables use SERIAL/UUID primary keys with proper foreign key relationships and indexes for performance.

### Component Structure

- **App.jsx** - Main application component containing all logic, state management, and UI
  - Dashboard view with metrics and recent activity
  - Companies view with expandable contact lists
  - My Calls view for assigned companies
  - Leaderboard for tracking team performance
  
- **SearchBar.jsx** - Reusable search/filter component (currently separate but could be integrated)

### Key Features

1. **Real-time Updates** - Uses Supabase channels for live data synchronization
2. **CSV Import** - Bulk upload companies and contacts from CSV files
3. **Export Functionality** - Export calls and signups to CSV
4. **Multi-user Support** - 15 predefined callers with individual tracking
5. **Call Logging** - Detailed call outcome tracking with follow-up dates
6. **Signup Management** - Track event registrations with attendee counts

### State Management

The app uses React's useState for local state management with these key states:
- companies, contacts, calls, signups (data arrays)
- currentUser (selected caller)
- activeTab (navigation)
- Modal states for call/signup logging and CSV uploads
- Form states with validation

### Environment Variables

The application expects these environment variables:
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
```

Note: V2 (1).txt contains an older version that hardcodes these values directly.

## Development Notes

1. **Authentication**: Currently uses a simple dropdown for user selection (no auth required per README)
2. **Real-time**: All data changes are synchronized across users via Supabase subscriptions
3. **Validation**: Both client-side form validation and proper error handling
4. **Performance**: Includes indexes on foreign keys and commonly queried fields
5. **Data Import**: CSV parser handles company/contact relationships and deduplication

## Common Tasks

### Adding a New Caller
Add to the `callers` array in App.jsx:
```javascript
{ id: 12, name: 'New Person', email: 'newperson@buildai.com' }
```

### Modifying Call Outcomes
Update the select options in the Call Modal section (around line 1125 in App.jsx)

### Changing Company Statuses
Statuses are: 'not_started', 'in_progress', 'signed_up', 'not_interested'

### Database Backup
The app includes a backup feature that exports all data as JSON (see backupDatabase function)

## Important Considerations

1. The app auto-claims companies when calls are logged
2. Company status auto-updates based on call outcomes
3. All timestamps are stored in UTC
4. The leaderboard ranks by signup count
5. Search functionality includes company names, contacts, and metadata