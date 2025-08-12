import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getAllCompaniesWithoutContacts() {
  let allCompanies = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  
  // Get ALL companies with pagination
  while (hasMore) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('id')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      allCompanies = [...allCompanies, ...data];
      offset += limit;
      hasMore = data.length === limit;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Total companies found: ${allCompanies.length}`);
  
  // Get ALL contacts
  let allContacts = [];
  offset = 0;
  hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, company_id')
      .order('id')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      allContacts = [...allContacts, ...data];
      offset += limit;
      hasMore = data.length === limit;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Total contacts found: ${allContacts.length}`);
  
  // Find companies without contacts
  const companiesWithContacts = new Set(allContacts.map(c => c.company_id));
  const companiesWithoutContacts = allCompanies.filter(company => 
    !companiesWithContacts.has(company.id)
  );
  
  console.log(`Companies WITHOUT contacts: ${companiesWithoutContacts.length}`);
  
  return companiesWithoutContacts;
}

async function deleteAllCompaniesWithoutContacts() {
  const companiesWithoutContacts = await getAllCompaniesWithoutContacts();
  
  if (companiesWithoutContacts.length === 0) {
    console.log('No companies without contacts found!');
    return;
  }
  
  const companyIds = companiesWithoutContacts.map(c => c.id);
  
  // Check for calls and signups
  const { data: calls } = await supabase
    .from('calls')
    .select('company_id')
    .in('company_id', companyIds);
  
  const { data: signups } = await supabase
    .from('signups')
    .select('company_id')
    .in('company_id', companyIds);
  
  if ((calls && calls.length > 0) || (signups && signups.length > 0)) {
    console.log('WARNING: Some companies without contacts have calls or signups!');
    return;
  }
  
  // Delete in batches
  console.log('\nDeleting ALL companies without contacts...');
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < companyIds.length; i += batchSize) {
    const batch = companyIds.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .in('id', batch);
    
    if (error) {
      console.error('Error deleting batch:', error);
      break;
    }
    
    deleted += batch.length;
    console.log(`Deleted ${deleted} / ${companyIds.length} companies...`);
  }
  
  console.log(`\nSuccessfully deleted ${deleted} companies without contacts`);
  
  // Verify
  const remaining = await getAllCompaniesWithoutContacts();
  console.log(`\nVerification: ${remaining.length} companies without contacts remain`);
}

deleteAllCompaniesWithoutContacts().catch(console.error);