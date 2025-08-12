import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCompaniesWithoutContacts() {
  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');
  
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
  
  console.log(`Total companies: ${companies.length}`);
  console.log(`Companies with contacts: ${companiesWithContacts.size}`);
  console.log(`Companies WITHOUT contacts: ${companiesWithoutContacts.length}`);
  
  if (companiesWithoutContacts.length > 0) {
    console.log('\nFirst 20 companies without contacts:');
    companiesWithoutContacts.slice(0, 20).forEach(company => {
      console.log(`  - ${company.name} (ID: ${company.id})`);
    });
    
    // Check if these are from the separated CSV
    console.log('\nChecking if these match the separated CSV companies...');
    const separatedCsvCompanies = companiesWithoutContacts.filter(c => 
      c.name.includes('LLC') || c.name.includes('Inc') || c.name.includes('Corp')
    );
    console.log(`Companies that look like they're from separated CSV: ${separatedCsvCompanies.length}`);
  }
}

checkCompaniesWithoutContacts().catch(console.error);