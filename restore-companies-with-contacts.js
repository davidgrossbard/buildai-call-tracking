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
  // Remove extra quotes and trim
  return value.replace(/^"+|"+$/g, '').trim();
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

async function restoreCompaniesWithContacts() {
  const companiesCsvPath = '/Users/dovidgrossbard/Downloads/Companies-Grid view.csv';
  const contactsCsvPath = '/Users/dovidgrossbard/Downloads/Contacts-Grid view.csv';
  
  // First, read all companies from CSV
  const companiesFromCsv = new Map();
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(companiesCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const companyKey = Object.keys(row).find(key => key.includes('Company Name')) || 'Company Name';
        const buildingKey = Object.keys(row).find(key => key.includes('# Buildings')) || '# Buildings';
        const statusKey = Object.keys(row).find(key => key.includes('Status')) || 'Status';
        
        const companyName = cleanData(row[companyKey]);
        if (companyName) {
          companiesFromCsv.set(companyName, {
            name: companyName,
            num_buildings: parseInt(row[buildingKey]) || 0,
            status: row[statusKey] === 'active' ? 'not_started' : 'not_started',
            account_manager: cleanData(row['Account Manager']),
            sales_rep: cleanData(row['Sales Rep'])
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${companiesFromCsv.size} companies in CSV`);
  
  // Read all contacts from CSV
  const contactsByCompany = new Map();
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(contactsCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const companyName = cleanData(row['Company']);
        if (companyName) {
          if (!contactsByCompany.has(companyName)) {
            contactsByCompany.set(companyName, []);
          }
          
          const firstName = cleanData(row['First']);
          const lastName = cleanData(row['Last']);
          const fullName = cleanData(row['Full Name']) || `${firstName || ''} ${lastName || ''}`.trim();
          
          if (fullName) {
            contactsByCompany.get(companyName).push({
              name: fullName,
              first_name: firstName,
              last_name: lastName,
              title: cleanData(row['Title']),
              phone: parsePhoneNumber(row['Phone']),
              mobile: parsePhoneNumber(row['Phone2']),
              email: cleanData(row['Email'])
            });
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found contacts for ${contactsByCompany.size} companies`);
  
  // Get existing companies from database
  const { data: existingCompanies } = await supabase
    .from('companies')
    .select('id, name');
  
  const existingCompanyNames = new Set(existingCompanies.map(c => c.name));
  
  // Find companies that need to be restored (in CSV but not in DB)
  const companiesToRestore = [];
  for (const [companyName, companyData] of companiesFromCsv) {
    if (!existingCompanyNames.has(companyName) && contactsByCompany.has(companyName)) {
      companiesToRestore.push({
        ...companyData,
        contacts: contactsByCompany.get(companyName)
      });
    }
  }
  
  console.log(`\nNeed to restore ${companiesToRestore.length} companies with contacts`);
  
  // Show some examples
  console.log('\nFirst 10 companies to restore:');
  companiesToRestore.slice(0, 10).forEach(company => {
    console.log(`  - ${company.name} (${company.contacts.length} contacts)`);
  });
  
  // Check specifically for "1440 Park Apt., Inc."
  const targetCompany = companiesToRestore.find(c => c.name.includes('1440 Park'));
  if (targetCompany) {
    console.log(`\nFound "1440 Park Apt., Inc.":`);
    console.log(`  Name: ${targetCompany.name}`);
    console.log(`  Buildings: ${targetCompany.num_buildings}`);
    console.log(`  Contacts:`);
    targetCompany.contacts.forEach(contact => {
      console.log(`    - ${contact.name} (${contact.title})`);
    });
  }
  
  // Restore companies with their contacts
  console.log('\nRestoring companies...');
  let restored = 0;
  
  for (const company of companiesToRestore) {
    // Insert company
    const { data: insertedCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        num_buildings: company.num_buildings,
        status: company.status,
        account_manager: company.account_manager,
        sales_rep: company.sales_rep
      })
      .select()
      .single();
    
    if (companyError) {
      console.error(`Error inserting company ${company.name}:`, companyError);
      continue;
    }
    
    // Insert contacts for this company (only use fields that exist in the database)
    const contactsToInsert = company.contacts.map(contact => ({
      name: contact.name,
      title: contact.title,
      phone: contact.phone,
      mobile: contact.mobile,
      email: contact.email,
      company_id: insertedCompany.id
    }));
    
    const { error: contactsError } = await supabase
      .from('contacts')
      .insert(contactsToInsert);
    
    if (contactsError) {
      console.error(`Error inserting contacts for ${company.name}:`, contactsError);
    } else {
      restored++;
      if (restored % 10 === 0) {
        console.log(`Restored ${restored} companies...`);
      }
    }
  }
  
  console.log(`\nSuccessfully restored ${restored} companies with their contacts`);
}

restoreCompaniesWithContacts().catch(console.error);