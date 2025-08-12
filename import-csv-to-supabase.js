const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to clean and validate data
function cleanData(value) {
  if (!value || value === 'NULL' || value === 'null' || value === '') {
    return null;
  }
  return value.trim();
}

// Helper function to extract the first valid email from a comma-separated list
function extractFirstEmail(emailString) {
  if (!emailString || emailString === 'NULL') return null;
  
  const emails = emailString.split(',').map(e => e.trim()).filter(e => e && e !== 'NULL');
  return emails.length > 0 ? emails[0] : null;
}

// Helper function to extract the first valid phone number
function extractFirstPhone(phone, mobile) {
  const cleanPhone = cleanData(phone);
  const cleanMobile = cleanData(mobile);
  
  // Prefer mobile if available, otherwise use phone
  return cleanMobile || cleanPhone;
}

async function importData() {
  const companies = new Map(); // To store unique companies
  const contacts = [];
  
  console.log('Reading CSV file...');
  
  // Read and parse CSV
  const csvPath = path.join(__dirname, 'Build AI Invite - Master List (2).csv');
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract company info
        const companyName = cleanData(row.Company);
        if (companyName) {
          if (!companies.has(companyName)) {
            companies.set(companyName, {
              name: companyName,
              address: cleanData(row['Office Address']) || cleanData(row['Mailing Address']),
              num_buildings: parseInt(row.NumOfBuildings) || 0,
              account_manager: cleanData(row['Account Manager']),
              sales_rep: cleanData(row['Sales Rep']),
              status: 'not_started',
              priority: 'medium',
              metadata: {
                original_status: cleanData(row.Status),
                notes: cleanData(row.Notes)
              }
            });
          }
          
          // Extract contact info
          const firstName = cleanData(row.First);
          const lastName = cleanData(row.Last);
          
          if (firstName || lastName) {
            const contact = {
              company_name: companyName,
              name: [firstName, lastName].filter(Boolean).join(' '),
              title: cleanData(row.Title),
              phone: extractFirstPhone(row.Phone, row.Mobile),
              email: extractFirstEmail(row.Email),
              notes: cleanData(row.Notes)
            };
            
            // Only add if we have at least a name
            if (contact.name) {
              contacts.push(contact);
            }
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${companies.size} unique companies and ${contacts.length} contacts`);
  
  // Upload companies first
  console.log('Uploading companies to Supabase...');
  const companiesArray = Array.from(companies.values());
  
  // Upload in batches of 100
  const companyBatchSize = 100;
  const companyIdMap = new Map(); // To map company names to their IDs
  
  for (let i = 0; i < companiesArray.length; i += companyBatchSize) {
    const batch = companiesArray.slice(i, i + companyBatchSize);
    
    const { data, error } = await supabase
      .from('companies')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error uploading companies batch ${i / companyBatchSize + 1}:`, error);
      continue;
    }
    
    // Store the company IDs for contact linking
    data.forEach(company => {
      companyIdMap.set(company.name, company.id);
    });
    
    console.log(`Uploaded ${i + batch.length} / ${companiesArray.length} companies`);
  }
  
  // Now upload contacts with proper company_id references
  console.log('Uploading contacts to Supabase...');
  
  // Transform contacts to include company_id
  const contactsWithCompanyId = contacts
    .filter(contact => companyIdMap.has(contact.company_name))
    .map(contact => ({
      company_id: companyIdMap.get(contact.company_name),
      name: contact.name,
      title: contact.title,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes
    }));
  
  // Upload contacts in batches
  const contactBatchSize = 100;
  
  for (let i = 0; i < contactsWithCompanyId.length; i += contactBatchSize) {
    const batch = contactsWithCompanyId.slice(i, i + contactBatchSize);
    
    const { error } = await supabase
      .from('contacts')
      .insert(batch);
    
    if (error) {
      console.error(`Error uploading contacts batch ${i / contactBatchSize + 1}:`, error);
      continue;
    }
    
    console.log(`Uploaded ${i + batch.length} / ${contactsWithCompanyId.length} contacts`);
  }
  
  console.log('Import completed!');
  console.log(`Total companies uploaded: ${companies.size}`);
  console.log(`Total contacts uploaded: ${contactsWithCompanyId.length}`);
}

// Run the import
importData().catch(console.error);