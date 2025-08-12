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

async function updateCallerAssignments() {
  const callerAssignments = new Map(); // Map of company name to caller
  const originalCsvPath = '/Users/dovidgrossbard/Downloads/Build AI Invite - Master List (2).csv';
  
  console.log('Reading original CSV to extract caller assignments...');
  
  // Read the original CSV to get caller assignments
  await new Promise((resolve, reject) => {
    fs.createReadStream(originalCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        const caller = cleanData(row.Caller);
        const company = cleanData(row.Company);
        
        if (caller && company) {
          // Store the caller assignment for this company
          callerAssignments.set(company, caller);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${callerAssignments.size} unique company assignments`);
  
  // Get all companies from database with pagination
  let companies = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, assigned_to')
      .order('name')
      .range(offset, offset + limit - 1);
    
    if (fetchError) {
      console.error('Error fetching companies:', fetchError);
      return;
    }
    
    if (data && data.length > 0) {
      companies = [...companies, ...data];
      offset += limit;
      hasMore = data.length === limit;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Found ${companies.length} companies in database`);
  
  // Update companies with caller assignments
  let updateCount = 0;
  let notFoundCount = 0;
  
  for (const company of companies) {
    const assignedCaller = callerAssignments.get(company.name);
    
    if (assignedCaller && assignedCaller !== company.assigned_to) {
      const { error } = await supabase
        .from('companies')
        .update({ 
          assigned_to: assignedCaller,
          status: company.assigned_to ? company.status : 'not_started' // Only change status if not already assigned
        })
        .eq('id', company.id);
      
      if (error) {
        console.error(`Error updating ${company.name}:`, error);
      } else {
        updateCount++;
        console.log(`Updated ${company.name} -> assigned to ${assignedCaller}`);
      }
    } else if (!assignedCaller && company.name) {
      notFoundCount++;
    }
  }
  
  console.log('\nSummary:');
  console.log(`- Companies updated: ${updateCount}`);
  console.log(`- Companies not found in original CSV: ${notFoundCount}`);
  console.log(`- Total companies with assignments: ${callerAssignments.size}`);
  
  // Show some examples of assignments
  console.log('\nSample assignments from original CSV:');
  let count = 0;
  for (const [company, caller] of callerAssignments) {
    console.log(`  ${company} -> ${caller}`);
    if (++count >= 10) break;
  }
}

updateCallerAssignments().catch(console.error);