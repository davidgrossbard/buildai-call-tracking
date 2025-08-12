import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCompanyCount() {
  // Get total count
  const { count, error: countError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error getting count:', countError);
    return;
  }
  
  console.log(`Total companies in database: ${count}`);
  
  // Get actual data with increased limit
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('id')
    .limit(3000);
  
  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }
  
  console.log(`Companies fetched: ${data.length}`);
  console.log(`First company: ${data[0]?.name} (ID: ${data[0]?.id})`);
  console.log(`Last company: ${data[data.length-1]?.name} (ID: ${data[data.length-1]?.id})`);
}

checkCompanyCount();