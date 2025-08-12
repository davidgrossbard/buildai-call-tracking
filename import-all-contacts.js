import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function cleanData(value) {
  if (!value || value === 'NULL' || value === 'null' || value === '') {
    return null;
  }
  return value.trim();
}

function parsePhoneNumber(phone) {
  if (!phone || phone === 'NULL') return null;
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Format as needed
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

async function importAllContacts() {
  const contactsCsvPath = '/Users/dovidgrossbard/Downloads/Build AI Invite - Contacts (1).csv';
  
  // First, get all existing companies to map names to IDs
  console.log('Loading existing companies...');
  let allCompanies = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('id')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching companies:', error);
      return;
    }
    
    if (data && data.length > 0) {
      allCompanies = [...allCompanies, ...data];
      offset += limit;
      hasMore = data.length === limit;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Found ${allCompanies.length} companies in database`);
  
  // Create a map for quick lookup
  const companyMap = new Map();
  allCompanies.forEach(company => {
    companyMap.set(company.name.toLowerCase(), company.id);
  });
  
  // Read contacts from CSV
  const contactsFromCsv = [];
  const unmatchedCompanies = new Set();
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(contactsCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const firstName = cleanData(row['First']);
        const lastName = cleanData(row['Last']);
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        const companyName = cleanData(row['Company']);
        
        if (fullName && companyName) {
          const companyId = companyMap.get(companyName.toLowerCase());
          
          if (companyId) {
            contactsFromCsv.push({
              name: fullName,
              title: cleanData(row['Title']),
              phone: parsePhoneNumber(row['Phone']),
              mobile: parsePhoneNumber(row['Phone2']),
              email: cleanData(row['Email']),
              company_id: companyId,
              company_name: companyName
            });
          } else {
            unmatchedCompanies.add(companyName);
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\nFound ${contactsFromCsv.length} contacts with matching companies`);
  console.log(`Found ${unmatchedCompanies.size} companies that don't exist in database`);
  
  if (unmatchedCompanies.size > 0) {
    console.log('\nFirst 10 unmatched companies:');
    [...unmatchedCompanies].slice(0, 10).forEach(company => {
      console.log(`  - ${company}`);
    });
  }
  
  // Get existing contacts to avoid duplicates
  console.log('\nChecking for existing contacts...');
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('name, company_id');
  
  const existingSet = new Set(
    existingContacts.map(c => `${c.name.toLowerCase()}_${c.company_id}`)
  );
  
  // Filter out contacts that already exist
  const newContacts = contactsFromCsv.filter(contact => {
    const key = `${contact.name.toLowerCase()}_${contact.company_id}`;
    return !existingSet.has(key);
  });
  
  console.log(`\n${newContacts.length} new contacts to add`);
  
  if (newContacts.length === 0) {
    console.log('All contacts already exist in the database!');
    return;
  }
  
  // Insert new contacts in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newContacts.length; i += batchSize) {
    const batch = newContacts.slice(i, i + batchSize).map(contact => ({
      name: contact.name,
      title: contact.title,
      phone: contact.phone,
      mobile: contact.mobile,
      email: contact.email,
      company_id: contact.company_id
    }));
    
    const { error } = await supabase
      .from('contacts')
      .insert(batch);
    
    if (error) {
      console.error('Error inserting batch:', error);
      break;
    }
    
    inserted += batch.length;
    console.log(`Inserted ${inserted} / ${newContacts.length} contacts...`);
  }
  
  console.log(`\nSuccessfully added ${inserted} new contacts`);
  
  // Show some examples of what was added
  console.log('\nSample of added contacts:');
  newContacts.slice(0, 5).forEach(contact => {
    console.log(`  - ${contact.name} at ${contact.company_name}`);
  });
}

importAllContacts().catch(console.error);