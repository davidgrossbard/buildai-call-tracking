import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import { config } from 'dotenv';

// Load environment variables
config();

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

// Helper function to clean phone numbers (remove parentheses and dashes)
function cleanPhone(phone) {
  const cleaned = cleanData(phone);
  if (!cleaned) return null;
  // Remove all non-numeric characters except + at the beginning
  return cleaned.replace(/[^\d+]/g, '').replace(/^\+/, '+');
}

// Map priority based on some logic (you can adjust this)
function mapPriority(buildings) {
  const buildingCount = parseInt(buildings) || 0;
  if (buildingCount >= 10) return 'high';
  if (buildingCount >= 5) return 'medium';
  return 'low';
}

async function importCompanies() {
  const companies = [];
  const companiesPath = '/Users/dovidgrossbard/Downloads/Companies-Grid view.csv';
  
  console.log('Reading companies CSV file...');
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(companiesPath)
      .pipe(csv())
      .on('data', (row) => {
        // Handle BOM in first column name
        const companyKey = Object.keys(row).find(key => key.includes('Company Name')) || 'Company Name';
        const companyName = cleanData(row[companyKey]);
        if (companyName) {
          const buildingCount = parseInt(row.Buildings) || 0;
          
          companies.push({
            name: companyName,
            status: 'not_started', // Default status
            assigned_to: cleanData(row['Assigned To']),
            priority: mapPriority(row.Buildings),
            num_buildings: buildingCount, // Changed from building_count to num_buildings
            account_manager: cleanData(row['Account Manager']),
            sales_rep: cleanData(row['Sales Rep']),
            sales_status: cleanData(row['Sales Status']),
            address: null, // Address not in the companies CSV
            notes: null // Notes not in the companies CSV
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${companies.length} companies to import`);
  
  // Clear existing data (optional - comment out if you want to append)
  console.log('Clearing existing companies and contacts...');
  await supabase.from('contacts').delete().neq('id', 0);
  await supabase.from('companies').delete().neq('id', 0);
  
  // Upload companies in batches
  const batchSize = 100;
  const companyIdMap = new Map();
  
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('companies')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error uploading companies batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }
    
    // Store company name to ID mapping
    data.forEach(company => {
      companyIdMap.set(company.name, company.id);
    });
    
    console.log(`Uploaded ${i + batch.length} / ${companies.length} companies`);
  }
  
  return companyIdMap;
}

async function importContacts(companyIdMap) {
  const contacts = [];
  const contactsPath = '/Users/dovidgrossbard/Downloads/Contacts-Grid view.csv';
  
  console.log('Reading contacts CSV file...');
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(contactsPath)
      .pipe(csv())
      .on('data', (row) => {
        // Handle BOM in first column name
        const nameKey = Object.keys(row).find(key => key.includes('Full Name')) || 'Full Name';
        const fullName = cleanData(row[nameKey]);
        const companyName = cleanData(row.Company);
        
        // Skip contacts without a name or company
        if (fullName && companyName && companyIdMap.has(companyName)) {
          // Get the best phone number (prefer Phone2 if available)
          const phone = cleanPhone(row.Phone2) || cleanPhone(row.Phone);
          
          contacts.push({
            company_id: companyIdMap.get(companyName),
            name: fullName,
            title: cleanData(row.Title),
            phone: phone,
            email: cleanData(row.Email) === 'NULL' ? null : cleanData(row.Email),
            notes: null
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${contacts.length} contacts to import`);
  
  // Upload contacts in batches
  const batchSize = 100;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('contacts')
      .insert(batch);
    
    if (error) {
      console.error(`Error uploading contacts batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }
    
    console.log(`Uploaded ${i + batch.length} / ${contacts.length} contacts`);
  }
  
  return contacts.length;
}

async function runImport() {
  try {
    console.log('Starting import process...');
    
    // Import companies first
    const companyIdMap = await importCompanies();
    
    // Then import contacts with company references
    const contactCount = await importContacts(companyIdMap);
    
    console.log('\nImport completed successfully!');
    console.log(`Total companies imported: ${companyIdMap.size}`);
    console.log(`Total contacts imported: ${contactCount}`);
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Run the import
runImport();