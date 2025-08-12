import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addMissingContacts() {
  // Add Harry Frankel to 1440 Park Apt., Inc.
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('name', '1440 Park Apt., Inc.')
    .single();
  
  if (company) {
    const { error } = await supabase
      .from('contacts')
      .insert({
        name: 'Harry Frankel',
        title: 'Owner',
        phone: '(718) 258-5250',
        mobile: '(917) 418-6275',
        email: 'rebbimb@optonline.net',
        company_id: company.id
      });
    
    if (error) {
      console.error('Error adding Harry Frankel:', error);
    } else {
      console.log('Successfully added Harry Frankel to 1440 Park Apt., Inc.');
    }
  }
  
  // Also update the building count
  const { error: updateError } = await supabase
    .from('companies')
    .update({ num_buildings: 1 })
    .eq('name', '1440 Park Apt., Inc.');
  
  if (updateError) {
    console.error('Error updating building count:', updateError);
  } else {
    console.log('Updated building count to 1');
  }
}

addMissingContacts().catch(console.error);