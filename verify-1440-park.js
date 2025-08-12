import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verify1440Park() {
  // Search for the company
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', '%1440 Park%');
  
  if (companyError) {
    console.error('Error searching companies:', companyError);
    return;
  }
  
  console.log(`Found ${companies.length} companies matching "1440 Park":`);
  
  for (const company of companies) {
    console.log(`\nCompany: ${company.name}`);
    console.log(`  ID: ${company.id}`);
    console.log(`  Buildings: ${company.num_buildings}`);
    console.log(`  Status: ${company.status}`);
    console.log(`  Assigned to: ${company.assigned_to || 'None'}`);
    
    // Get contacts for this company
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', company.id);
    
    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
    } else {
      console.log(`  Contacts (${contacts.length}):`);
      contacts.forEach(contact => {
        console.log(`    - ${contact.name} (${contact.title})`);
        console.log(`      Phone: ${contact.phone || 'N/A'}`);
        console.log(`      Mobile: ${contact.mobile || 'N/A'}`);
        console.log(`      Email: ${contact.email || 'N/A'}`);
      });
    }
  }
  
  // Also check total companies
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal companies in database: ${count}`);
}

verify1440Park().catch(console.error);