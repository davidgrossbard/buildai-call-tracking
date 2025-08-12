import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deleteCompaniesWithoutContacts() {
  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name');
  
  if (companiesError) {
    console.error('Error fetching companies:', companiesError);
    return;
  }
  
  // Get all contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, company_id');
  
  if (contactsError) {
    console.error('Error fetching contacts:', contactsError);
    return;
  }
  
  // Create a Set of company IDs that have contacts
  const companiesWithContacts = new Set(contacts.map(c => c.company_id));
  
  // Find companies without contacts
  const companiesWithoutContacts = companies.filter(company => 
    !companiesWithContacts.has(company.id)
  );
  
  console.log(`Found ${companiesWithoutContacts.length} companies without contacts`);
  
  // First, let's check if any of these companies have calls or signups
  const companyIds = companiesWithoutContacts.map(c => c.id);
  
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('company_id')
    .in('company_id', companyIds);
  
  if (callsError) {
    console.error('Error checking calls:', callsError);
    return;
  }
  
  const { data: signups, error: signupsError } = await supabase
    .from('signups')
    .select('company_id')
    .in('company_id', companyIds);
  
  if (signupsError) {
    console.error('Error checking signups:', signupsError);
    return;
  }
  
  console.log(`Companies without contacts that have calls: ${calls.length}`);
  console.log(`Companies without contacts that have signups: ${signups.length}`);
  
  if (calls.length > 0 || signups.length > 0) {
    console.log('WARNING: Some companies without contacts have calls or signups!');
    console.log('These should be investigated before deletion.');
    return;
  }
  
  // Delete companies without contacts in batches
  console.log('\nDeleting companies without contacts...');
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < companyIds.length; i += batchSize) {
    const batch = companyIds.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
      break;
    }
    
    deleted += batch.length;
    console.log(`Deleted ${deleted} / ${companyIds.length} companies...`);
  }
  
  console.log(`\nSuccessfully deleted ${deleted} companies without contacts`);
}

// Prompt for confirmation
console.log('This will DELETE all companies that have no contacts.');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  deleteCompaniesWithoutContacts().catch(console.error);
}, 5000);