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

async function analyzeDataMismatch() {
  // Get unique companies from original CSV
  const originalCompanies = new Set();
  const callerAssignments = new Map();
  const originalCsvPath = '/Users/dovidgrossbard/Downloads/Build AI Invite - Master List (2).csv';
  
  console.log('Reading original CSV...');
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(originalCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const company = cleanData(row.Company);
        const caller = cleanData(row.Caller);
        
        if (company) {
          originalCompanies.add(company);
          if (caller && !callerAssignments.has(company)) {
            callerAssignments.set(company, caller);
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\nOriginal CSV contains ${originalCompanies.size} unique companies`);
  
  // Get companies from separated CSV
  const separatedCompanies = new Set();
  const companiesCsvPath = '/Users/dovidgrossbard/Downloads/Companies-Grid view.csv';
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(companiesCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const companyKey = Object.keys(row).find(key => key.includes('Company Name')) || 'Company Name';
        const company = cleanData(row[companyKey]);
        
        if (company) {
          separatedCompanies.add(company);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Separated Companies CSV contains ${separatedCompanies.size} companies`);
  
  // Get companies from database
  const { data: dbCompanies, error } = await supabase
    .from('companies')
    .select('name, assigned_to')
    .order('name');
  
  if (error) {
    console.error('Error fetching from database:', error);
    return;
  }
  
  const dbCompanyNames = new Set(dbCompanies.map(c => c.name));
  console.log(`Database contains ${dbCompanyNames.size} companies`);
  
  // Find missing companies
  console.log('\n=== MISSING COMPANIES ===');
  console.log('\nCompanies in original CSV but NOT in database:');
  const missingInDb = [];
  for (const company of originalCompanies) {
    if (!dbCompanyNames.has(company)) {
      missingInDb.push(company);
      const caller = callerAssignments.get(company) || 'No caller assigned';
      console.log(`  - ${company} (Assigned to: ${caller})`);
    }
  }
  
  console.log(`\nTotal missing: ${missingInDb.length} companies`);
  
  // Check if they're in the separated CSV
  console.log('\nChecking if missing companies are in separated CSV:');
  let inSeparated = 0;
  let notInSeparated = 0;
  
  for (const company of missingInDb) {
    if (separatedCompanies.has(company)) {
      inSeparated++;
    } else {
      notInSeparated++;
      console.log(`  - ${company} is NOT in separated Companies CSV`);
    }
  }
  
  console.log(`\n${inSeparated} missing companies ARE in separated CSV (import issue)`);
  console.log(`${notInSeparated} missing companies are NOT in separated CSV (data issue)`);
  
  // Show some companies that are in DB but not in original
  console.log('\n=== EXTRA COMPANIES ===');
  console.log('Companies in database but NOT in original CSV:');
  let extraCount = 0;
  for (const company of dbCompanyNames) {
    if (!originalCompanies.has(company)) {
      console.log(`  - ${company}`);
      extraCount++;
      if (extraCount >= 20) {
        console.log('  ... and more');
        break;
      }
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Original CSV: ${originalCompanies.size} companies`);
  console.log(`Separated CSV: ${separatedCompanies.size} companies`);
  console.log(`Database: ${dbCompanyNames.size} companies`);
  console.log(`Missing from DB: ${missingInDb.length} companies`);
  console.log(`Companies with caller assignments: ${callerAssignments.size}`);
}

analyzeDataMismatch().catch(console.error);