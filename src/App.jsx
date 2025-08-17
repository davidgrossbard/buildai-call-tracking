import React, { useState, useEffect } from 'react';
import { Phone, Users, CheckCircle, Activity, User, Building, Calendar, TrendingUp, Clock, UserPlus, PhoneCall, Target, Award, Upload, Download, FileDown, AlertCircle, Loader2, Search } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client with error handling
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const App = () => {
  // Check for missing environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h1>
          <p className="text-gray-700 mb-4">Environment variables are not configured properly.</p>
          <div className="bg-gray-100 p-3 rounded text-sm">
            <p className="font-mono">VITE_SUPABASE_URL: {SUPABASE_URL || 'Not set'}</p>
            <p className="font-mono">VITE_SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
          </div>
          <p className="text-xs text-gray-500 mt-4">Please check your Vercel environment variables.</p>
        </div>
      </div>
    );
  }
  
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [accountManagerFilter, setAccountManagerFilter] = useState('all');
  const [salesRepFilter, setSalesRepFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'buildings'
  const [myCallsSearchTerm, setMyCallsSearchTerm] = useState(''); // Search for My Calls tab

  // Callers list from database
  const [callers, setCallers] = useState([]);

  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const [expandedMyCallsCompanies, setExpandedMyCallsCompanies] = useState(new Set());
  
  // Pagination state for Companies tab
  const [companiesPage, setCompaniesPage] = useState(1);
  const companiesPerPage = 50;

  // Form states
  const [callForm, setCallForm] = useState({
    outcome: '',
    notes: '',
    followUpDate: ''
  });

  const [signupForm, setSignupForm] = useState({
    expectedAttendees: 1,
    specialRequirements: '',
    notes: ''
  });

  // Load initial data from Supabase
  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const companiesSubscription = supabase
      .channel('companies-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'companies' },
        (payload) => {
          loadCompanies();
        }
      )
      .subscribe();

    const callsSubscription = supabase
      .channel('calls-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          loadCalls();
        }
      )
      .subscribe();

    const signupsSubscription = supabase
      .channel('signups-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'signups' },
        (payload) => {
          loadSignups();
        }
      )
      .subscribe();

    const callersSubscription = supabase
      .channel('callers-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'callers' },
        (payload) => {
          loadCallers();
        }
      )
      .subscribe();

    // Default user will be set after callers are loaded

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(companiesSubscription);
      supabase.removeChannel(callsSubscription);
      supabase.removeChannel(signupsSubscription);
      supabase.removeChannel(callersSubscription);
    };
  }, []);

  // Set default user when callers are loaded
  useEffect(() => {
    if (callers.length > 0 && !currentUser) {
      setCurrentUser(callers[0]);
    }
  }, [callers, currentUser]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadCompanies(),
        loadContacts(),
        loadCalls(),
        loadSignups(),
        loadCallers()
      ]);
    } catch (err) {
      setError('Failed to load data. Please check your Supabase configuration.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    // Supabase has a hard limit of 1000 rows per request
    // We need to fetch in batches
    let allCompanies = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allCompanies = [...allCompanies, ...data];
        offset += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }
    
    setCompanies(allCompanies);
  };

  const loadContacts = async () => {
    // Fetch contacts in batches due to Supabase limit
    let allContacts = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name')
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allContacts = [...allContacts, ...data];
        offset += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }
    
    setContacts(allContacts);
  };

  const loadCalls = async () => {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setCalls(data || []);
  };

  const loadSignups = async () => {
    const { data, error } = await supabase
      .from('signups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setSignups(data || []);
  };

  const loadCallers = async () => {
    const { data, error } = await supabase
      .from('callers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    setCallers(data || []);
  };

  // Get contacts for a specific company
  const getCompanyContacts = (companyId) => {
    return contacts.filter(c => c.company_id === companyId);
  };

  // Filter companies based on search and filter criteria
  const getFilteredCompanies = () => {
    let filtered = companies.filter(company => {
      // Search term filter
      const matchesSearch = searchTerm === '' || 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.account_manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.sales_rep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCompanyContacts(company.id).some(contact => 
          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
      // Status filter
      const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || company.priority === priorityFilter;
      
      // Assigned filter
      const matchesAssigned = assignedFilter === 'all' || 
        (assignedFilter === 'unassigned' && !company.assigned_to) ||
        (assignedFilter !== 'unassigned' && company.assigned_to === assignedFilter);
      
      // Account Manager filter
      const matchesAccountManager = accountManagerFilter === 'all' || 
        company.account_manager === accountManagerFilter;
      
      // Sales Rep filter
      const matchesSalesRep = salesRepFilter === 'all' || 
        company.sales_rep === salesRepFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesAccountManager && matchesSalesRep;
    });
    
    // Apply sorting
    if (sortBy === 'buildings') {
      filtered.sort((a, b) => (b.num_buildings || 0) - (a.num_buildings || 0));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  };

  // Get paginated companies
  const getPaginatedCompanies = () => {
    const filtered = getFilteredCompanies();
    const startIndex = (companiesPage - 1) * companiesPerPage;
    const endIndex = startIndex + companiesPerPage;
    return {
      companies: filtered.slice(startIndex, endIndex),
      totalCount: filtered.length,
      totalPages: Math.ceil(filtered.length / companiesPerPage)
    };
  };

  // Get unique account managers and sales reps for filters
  const getUniqueAccountManagers = () => {
    const managers = [...new Set(companies
      .map(c => c.account_manager)
      .filter(am => am && am.trim() !== '')
    )].sort();
    return managers;
  };

  const getUniqueSalesReps = () => {
    const reps = [...new Set(companies
      .map(c => c.sales_rep)
      .filter(sr => sr && sr.trim() !== '')
    )].sort();
    return reps;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssignedFilter('all');
    setAccountManagerFilter('all');
    setSalesRepFilter('all');
    setSortBy('name');
    setCompaniesPage(1); // Reset to first page
  };

  // Process CSV upload
  const handleFileUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        setUploadStatus('Processing CSV...');
        
        // Parse CSV rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            rows.push(row);
          }
        }
        
        // Group by company
        const companyMap = {};
        rows.forEach(row => {
          if (!row.Company) return;
          
          if (!companyMap[row.Company]) {
            companyMap[row.Company] = {
              name: row.Company,
              status: row.Caller ? 'in_progress' : 'not_started',
              assigned_to: row.Caller || null,
              priority: 'medium',
              num_buildings: parseInt(row.NumOfBuildings) || 0,
              account_manager: row['Account Manager'] || '',
              sales_rep: row['Sales Rep'] || '',
              contacts: []
            };
          }
          
          // Add contact
          companyMap[row.Company].contacts.push({
            name: ((row.First || '') + ' ' + (row.Last || '')).trim(),
            title: row.Title || '',
            phone: row.Phone || null,
            mobile: row.Mobile || null,
            email: row.Email || ''
          });
        });
        
        setUploadStatus('Uploading to database...');
        
        // Insert companies and contacts into Supabase
        for (const [companyName, companyData] of Object.entries(companyMap)) {
          // Insert company
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: companyData.name,
              status: companyData.status,
              assigned_to: companyData.assigned_to,
              priority: companyData.priority,
              num_buildings: companyData.num_buildings,
              account_manager: companyData.account_manager,
              sales_rep: companyData.sales_rep
            })
            .select()
            .single();
          
          if (companyError) {
            console.error('Error inserting company:', companyError);
            continue;
          }
          
          // Insert contacts for this company
          if (company && companyData.contacts.length > 0) {
            const contactsToInsert = companyData.contacts.map(contact => ({
              ...contact,
              company_id: company.id
            }));
            
            const { error: contactsError } = await supabase
              .from('contacts')
              .insert(contactsToInsert);
            
            if (contactsError) {
              console.error('Error inserting contacts:', contactsError);
            }
          }
        }
        
        setUploadStatus('Successfully imported ' + Object.keys(companyMap).length + ' companies!');
        await loadData(); // Reload all data
        
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadStatus('');
        }, 2000);
        
      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus('Error: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };

  // Export signups to CSV
  const exportSignups = () => {
    const signupData = signups.map(signup => {
      const company = companies.find(c => c.id === signup.company_id);
      const contact = contacts.find(c => c.id === signup.contact_id);
      const caller = callers.find(c => c.name === signup.caller_name);
      
      return {
        'Date': new Date(signup.created_at).toLocaleString(),
        'Company': company?.name || '',
        'Contact Name': contact?.name || '',
        'Contact Title': contact?.title || '',
        'Contact Email': contact?.email || '',
        'Contact Phone': contact?.phone || contact?.mobile || '',
        'Expected Attendees': signup.expected_attendees,
        'Special Requirements': signup.special_requirements || '',
        'Notes': signup.notes || '',
        'Caller': signup.caller_name || ''
      };
    });
    
    // Convert to CSV
    const headers = Object.keys(signupData[0] || {});
    const csvContent = [
      headers.join(','),
      ...signupData.map(row => 
        headers.map(header => '"' + (row[header] || '') + '"').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildai_signups_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  };

  // Export calls to CSV
  const exportCalls = () => {
    const callData = calls.map(call => {
      const company = companies.find(c => c.id === call.company_id);
      const contact = contacts.find(c => c.id === call.contact_id);
      
      return {
        'Date': new Date(call.created_at).toLocaleString(),
        'Company': company?.name || '',
        'Contact Name': contact?.name || '',
        'Contact Title': contact?.title || '',
        'Contact Phone': contact?.phone || contact?.mobile || '',
        'Outcome': call.outcome?.replace(/_/g, ' ') || '',
        'Follow-up Date': call.follow_up_date || '',
        'Notes': call.notes || '',
        'Caller': call.caller_name || ''
      };
    });
    
    // Convert to CSV
    const headers = Object.keys(callData[0] || {});
    const csvContent = [
      headers.join(','),
      ...callData.map(row => 
        headers.map(header => '"' + (row[header] || '') + '"').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildai_calls_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
  };

  // Calculate metrics
  const getMetrics = () => {
    const totalCompanies = companies.length;
    const assignedCompanies = companies.filter(c => c.assigned_to).length;
    const totalCalls = calls.length;
    const totalSignups = signups.length;
    const successRate = totalCalls > 0 ? ((totalSignups / totalCalls) * 100).toFixed(1) : 0;
    
    const callerStats = callers.map(caller => {
      const callerCompanies = companies.filter(c => c.assigned_to === caller.name);
      const callerCalls = calls.filter(c => c.caller_name === caller.name);
      const callerSignups = signups.filter(s => s.caller_name === caller.name);
      
      return {
        ...caller,
        companies: callerCompanies.length,
        calls: callerCalls.length,
        signups: callerSignups.length,
        successRate: callerCalls.length > 0 ? ((callerSignups.length / callerCalls.length) * 100).toFixed(1) : 0
      };
    });

    return {
      totalCompanies,
      assignedCompanies,
      totalCalls,
      totalSignups,
      successRate,
      callerStats
    };
  };

  // Assign company to caller
  const assignCompany = async (companyId, callerName) => {
    // If unassigning (empty string), set assigned_to to null and status back to not_started
    const updateData = callerName 
      ? { 
          assigned_to: callerName,
          status: 'in_progress'
        }
      : { 
          assigned_to: null,
          status: 'not_started'
        };
    
    const { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId);
    
    if (error) {
      console.error('Error assigning company:', error);
      alert('Failed to assign company. Please try again.');
    }
  };

  // Update company status
  const updateCompanyStatus = async (companyId, newStatus) => {
    const { error } = await supabase
      .from('companies')
      .update({ status: newStatus })
      .eq('id', companyId);
    
    if (error) {
      console.error('Error updating company status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Log a call
  const logCall = async () => {
    const { error } = await supabase
      .from('calls')
      .insert({
        company_id: selectedCompany.id,
        contact_id: selectedContact.id,
        caller_name: currentUser.name,
        outcome: callForm.outcome,
        notes: callForm.notes,
        follow_up_date: callForm.followUpDate || null
      });
    
    if (error) {
      console.error('Error logging call:', error);
      alert('Failed to log call. Please try again.');
      return;
    }
    
    // Update company status if not interested
    if (callForm.outcome === 'reached_not_interested') {
      await supabase
        .from('companies')
        .update({ status: 'not_interested' })
        .eq('id', selectedCompany.id);
    }
    
    // Reset form and close modal
    setCallForm({ outcome: '', notes: '', followUpDate: '' });
    setShowCallModal(false);
    setSelectedCompany(null);
    setSelectedContact(null);
  };

  // Log a signup
  const logSignup = async () => {
    const { error } = await supabase
      .from('signups')
      .insert({
        company_id: selectedCompany.id,
        contact_id: selectedContact.id,
        caller_name: currentUser.name,
        expected_attendees: signupForm.expectedAttendees,
        special_requirements: signupForm.specialRequirements,
        notes: signupForm.notes
      });
    
    if (error) {
      console.error('Error logging signup:', error);
      alert('Failed to log signup. Please try again.');
      return;
    }
    
    // Update company status
    await supabase
      .from('companies')
      .update({ status: 'signed_up' })
      .eq('id', selectedCompany.id);
    
    // Reset form and close modal
    setSignupForm({ expectedAttendees: 1, specialRequirements: '', notes: '' });
    setShowSignupModal(false);
    setSelectedCompany(null);
    setSelectedContact(null);
  };

  const metrics = getMetrics();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading BuildAI Tracker...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">BuildAI Event Tracker</h1>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                September 10th
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV</span>
              </button>
              <button
                onClick={exportSignups}
                disabled={signups.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                <span>Export Signups</span>
              </button>
              <button
                onClick={exportCalls}
                disabled={calls.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export Calls</span>
              </button>
              {(activeTab === 'mycalls' || activeTab === 'leaderboard') && (
                <select 
                  value={currentUser?.id || ''} 
                  onChange={(e) => setCurrentUser(callers.find(c => c.id === parseInt(e.target.value)))}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {callers.map(caller => (
                    <option key={caller.id} value={caller.id}>{caller.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {['dashboard', 'companies', 'my_calls', 'leaderboard'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={'py-3 px-1 border-b-2 font-medium text-sm transition-colors ' + 
                  (activeTab === tab 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700')
                }
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Companies</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalCompanies}</p>
                    <p className="text-sm text-gray-500">{metrics.assignedCompanies} assigned</p>
                  </div>
                  <Building className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalCalls}</p>
                    <p className="text-sm text-gray-500">All callers</p>
                  </div>
                  <PhoneCall className="w-10 h-10 text-green-500 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Signups</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalSignups}</p>
                    <p className="text-sm text-gray-500">
                      {signups.reduce((acc, s) => acc + (s.expected_attendees || 0), 0)} attendees
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-purple-500 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.successRate}%</p>
                    <p className="text-sm text-gray-500">Overall</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-orange-500 opacity-20" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="px-6 py-4">
                {calls.length === 0 && signups.length === 0 ? (
                  <p className="text-gray-500">No activity yet. Start making calls!</p>
                ) : (
                  <div className="space-y-3">
                    {[...calls.map(c => ({...c, type: 'call'})), 
                      ...signups.map(s => ({...s, type: 'signup'}))]
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .slice(0, 10)
                      .map((activity) => {
                        const isSignup = activity.type === 'signup';
                        const company = companies.find(c => c.id === activity.company_id);
                        
                        return (
                          <div key={activity.type + '-' + activity.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-3">
                              {isSignup ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Phone className="w-5 h-5 text-blue-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.caller_name} {isSignup ? 'got a signup from' : 'called'} {company?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(activity.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {isSignup && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                {activity.expected_attendees} attendees
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search companies, contacts, emails..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCompaniesPage(1); // Reset to first page when searching
                      }}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="signed_up">Signed Up</option>
                  <option value="not_interested">Not Interested</option>
                </select>
                <select 
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select 
                  value={assignedFilter}
                  onChange={(e) => {
                    setAssignedFilter(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Assigned</option>
                  <option value="unassigned">Unassigned</option>
                  {callers.map(caller => (
                    <option key={caller.id} value={caller.name}>
                      {caller.name}
                    </option>
                  ))}
                </select>
                <select 
                  value={accountManagerFilter}
                  onChange={(e) => {
                    setAccountManagerFilter(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Account Managers</option>
                  {getUniqueAccountManagers().map(manager => (
                    <option key={manager} value={manager}>
                      {manager}
                    </option>
                  ))}
                </select>
                <select 
                  value={salesRepFilter}
                  onChange={(e) => {
                    setSalesRepFilter(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sales Reps</option>
                  {getUniqueSalesReps().map(rep => (
                    <option key={rep} value={rep}>
                      {rep}
                    </option>
                  ))}
                </select>
                <select 
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCompaniesPage(1);
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="buildings">Sort by Buildings</option>
                </select>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
              {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assignedFilter !== 'all' || sortBy !== 'name') && (
                <p className="text-sm text-gray-600 mt-2">
                  Found {getPaginatedCompanies().totalCount} of {companies.length} companies
                </p>
              )}
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Companies ({getPaginatedCompanies().totalCount})
                </h2>
              </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buildings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rep</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedCompanies().companies.map(company => {
                    const companyContacts = getCompanyContacts(company.id);
                    const isExpanded = expandedCompanies.has(company.id);
                    return (
                      <React.Fragment key={company.id}>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedCompanies);
                                  if (isExpanded) {
                                    newExpanded.delete(company.id);
                                  } else {
                                    newExpanded.add(company.id);
                                  }
                                  setExpandedCompanies(newExpanded);
                                }}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{companyContacts.length} contacts</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{company.num_buildings || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{company.account_manager || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{company.sales_rep || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={company.status || 'not_started'}
                              onChange={(e) => updateCompanyStatus(company.id, e.target.value)}
                              className={'text-sm border rounded-md px-2 py-1 ' +
                                (company.status === 'signed_up' ? 'bg-green-50 text-green-800 border-green-300' :
                                company.status === 'in_progress' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' :
                                company.status === 'not_interested' ? 'bg-red-50 text-red-800 border-red-300' :
                                'bg-gray-50 text-gray-800 border-gray-300')
                              }
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="signed_up">Signed Up</option>
                              <option value="not_interested">Not Interested</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={company.assigned_to || ''}
                              onChange={(e) => assignCompany(company.id, e.target.value)}
                              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Unassigned</option>
                              {callers.map(caller => (
                                <option key={caller.id} value={caller.name}>
                                  {caller.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              {companyContacts.length > 0 && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedCompany(company);
                                      setSelectedContact(companyContacts[0]);
                                      setShowCallModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Log Call
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCompany(company);
                                      setSelectedContact(companyContacts[0]);
                                      setShowSignupModal(true);
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Log Signup
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && companyContacts.length > 0 && (
                          <tr>
                            <td colSpan="8" className="px-6 py-4 bg-gray-50">
                              <div className="text-sm font-medium text-gray-700 mb-3">Contacts:</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {companyContacts.map(contact => (
                                  <div key={contact.id} className="bg-white p-3 rounded-md border border-gray-200">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{contact.name}</div>
                                        <div className="text-xs text-gray-600">{contact.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {contact.phone && <div>📞 {contact.phone}</div>}
                                          {contact.mobile && <div>📱 {contact.mobile}</div>}
                                          {contact.email && <div>✉️ {contact.email}</div>}
                                        </div>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => {
                                            setSelectedCompany(company);
                                            setSelectedContact(contact);
                                            setShowCallModal(true);
                                          }}
                                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                          Call
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedCompany(company);
                                            setSelectedContact(contact);
                                            setShowSignupModal(true);
                                          }}
                                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                        >
                                          Signup
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {getPaginatedCompanies().totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((companiesPage - 1) * companiesPerPage) + 1} to {Math.min(companiesPage * companiesPerPage, getPaginatedCompanies().totalCount)} of {getPaginatedCompanies().totalCount} companies
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCompaniesPage(Math.max(1, companiesPage - 1))}
                    disabled={companiesPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, getPaginatedCompanies().totalPages))].map((_, idx) => {
                      let pageNumber;
                      if (getPaginatedCompanies().totalPages <= 5) {
                        pageNumber = idx + 1;
                      } else if (companiesPage <= 3) {
                        pageNumber = idx + 1;
                      } else if (companiesPage >= getPaginatedCompanies().totalPages - 2) {
                        pageNumber = getPaginatedCompanies().totalPages - 4 + idx;
                      } else {
                        pageNumber = companiesPage - 2 + idx;
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCompaniesPage(pageNumber)}
                          className={`px-3 py-1 rounded text-sm ${
                            companiesPage === pageNumber
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCompaniesPage(Math.min(getPaginatedCompanies().totalPages, companiesPage + 1))}
                    disabled={companiesPage === getPaginatedCompanies().totalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* My Calls Tab */}
        {activeTab === 'my_calls' && (
          <div className="space-y-6">
            {/* Search Bar for My Calls */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search your assigned companies..."
                  value={myCallsSearchTerm}
                  onChange={(e) => setMyCallsSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">My Assigned Companies</h2>
                  <div className="text-sm text-gray-600">
                    Viewing as: <span className="font-medium">{currentUser?.name || 'Select a user'}</span>
                  </div>
                </div>
                {myCallsSearchTerm && (
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {companies
                      .filter(c => c.assigned_to === currentUser?.name)
                      .filter(company => {
                        const searchLower = myCallsSearchTerm.toLowerCase();
                        return company.name.toLowerCase().includes(searchLower) ||
                               getCompanyContacts(company.id).some(contact => 
                                 contact.name.toLowerCase().includes(searchLower) ||
                                 contact.email?.toLowerCase().includes(searchLower) ||
                                 contact.phone?.includes(myCallsSearchTerm)
                               );
                      }).length} results
                  </p>
                )}
              </div>
              <div className="p-6">
                {companies.filter(c => c.assigned_to === currentUser?.name).length === 0 ? (
                  <p className="text-gray-500">No companies assigned yet. Go to Companies tab to claim some!</p>
                ) : (
                  <div className="space-y-4">
                    {companies
                      .filter(c => c.assigned_to === currentUser?.name)
                      .filter(company => {
                        // Search filter
                        if (!myCallsSearchTerm) return true;
                        const searchLower = myCallsSearchTerm.toLowerCase();
                        return company.name.toLowerCase().includes(searchLower) ||
                               getCompanyContacts(company.id).some(contact => 
                                 contact.name.toLowerCase().includes(searchLower) ||
                                 contact.email?.toLowerCase().includes(searchLower) ||
                                 contact.phone?.includes(myCallsSearchTerm)
                               );
                      })
                      .map(company => {
                      const companyContacts = getCompanyContacts(company.id);
                      const isExpanded = expandedMyCallsCompanies.has(company.id);
                      return (
                        <div key={company.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedMyCallsCompanies);
                                    if (isExpanded) {
                                      newExpanded.delete(company.id);
                                    } else {
                                      newExpanded.add(company.id);
                                    }
                                    setExpandedMyCallsCompanies(newExpanded);
                                  }}
                                  className="mr-2 text-gray-500 hover:text-gray-700"
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                                <h3 className="font-medium text-gray-900">{company.name}</h3>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 ml-6">
                                {companyContacts.length} contacts • {company.num_buildings || 'N/A'} buildings
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={'px-2 py-1 text-xs font-semibold rounded-full ' +
                                (company.status === 'signed_up' ? 'bg-green-100 text-green-800' :
                                company.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                company.status === 'not_interested' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800')
                              }>
                                {company.status?.replace('_', ' ') || 'not started'}
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to unassign ${company.name}?`)) {
                                    assignCompany(company.id, '');
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Unassign
                              </button>
                            </div>
                          </div>
                          
                          {/* Action buttons for company level */}
                          {!isExpanded && companyContacts.length > 0 && (
                            <div className="ml-6 mt-2 flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setSelectedContact(companyContacts[0]);
                                  setShowCallModal(true);
                                }}
                                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                              >
                                Log Call
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setSelectedContact(companyContacts[0]);
                                  setShowSignupModal(true);
                                }}
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                              >
                                Log Signup
                              </button>
                            </div>
                          )}
                          
                          {/* Expandable contacts section */}
                          {isExpanded && (
                            <div className="space-y-2 mt-3">
                              {companyContacts.map(contact => (
                                <div key={contact.id} className="flex items-center justify-between bg-gray-50 rounded p-3 ml-6">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{contact.name}</p>
                                    <p className="text-xs text-gray-500">{contact.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {contact.phone || contact.mobile || 'No phone'}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setSelectedCompany(company);
                                        setSelectedContact(contact);
                                        setShowCallModal(true);
                                      }}
                                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Log Call
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedCompany(company);
                                        setSelectedContact(contact);
                                        setShowSignupModal(true);
                                      }}
                                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                    >
                                      Signup
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* My Recent Calls */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">My Recent Calls</h2>
              </div>
              <div className="p-6">
                {calls.filter(c => c.caller_name === currentUser?.name).length === 0 ? (
                  <p className="text-gray-500">No calls logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {calls.filter(c => c.caller_name === currentUser?.name)
                      .slice(0, 20)
                      .map(call => {
                      const company = companies.find(c => c.id === call.company_id);
                      const contact = contacts.find(c => c.id === call.contact_id);
                      
                      return (
                        <div key={call.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{company?.name}</p>
                              <p className="text-sm text-gray-600">{contact?.name} • {contact?.title}</p>
                              <p className="text-sm text-gray-500">Outcome: {call.outcome?.replace(/_/g, ' ')}</p>
                              {call.notes && <p className="text-sm text-gray-500 mt-1">Notes: {call.notes}</p>}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(call.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Team Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Companies</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signups</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.callerStats
                    .sort((a, b) => b.signups - a.signups)
                    .map((caller, idx) => (
                      <tr key={caller.id} className={caller.id === currentUser?.id ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {idx === 0 && <Award className="w-5 h-5 text-yellow-500 mr-2" />}
                            {idx === 1 && <Award className="w-5 h-5 text-gray-400 mr-2" />}
                            {idx === 2 && <Award className="w-5 h-5 text-orange-600 mr-2" />}
                            <span className="text-sm font-medium text-gray-900">#{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {caller.name}
                            {caller.id === currentUser?.id && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caller.companies}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caller.calls}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">{caller.signups}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{caller.successRate}%</span>
                            <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: caller.successRate + '%' }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload CSV Database</h3>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-500"
                >
                  Click to upload CSV file
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Upload your BuildAI Invite Master List CSV
                </p>
              </div>
              
              {uploadStatus && (
                <div className={'p-3 rounded ' + (uploadStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                  {uploadStatus}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadStatus('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && selectedCompany && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log Call</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Contact</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {getCompanyContacts(selectedCompany.id).map(contact => (
                    <div 
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={'p-3 rounded-md cursor-pointer border transition-colors ' +
                        (selectedContact?.id === contact.id 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'bg-white border-gray-200 hover:bg-gray-50')
                      }
                    >
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📞 {contact.phone || contact.mobile || 'No phone'}
                      </div>
                      {contact.email && (
                        <div className="text-xs text-gray-500">✉️ {contact.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Call Outcome</label>
                <select 
                  value={callForm.outcome}
                  onChange={(e) => setCallForm({...callForm, outcome: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select outcome...</option>
                  <option value="reached_interested">Reached - Interested</option>
                  <option value="reached_not_interested">Reached - Not Interested</option>
                  <option value="reached_callback">Reached - Call Back Later</option>
                  <option value="no_answer">No Answer</option>
                  <option value="left_voicemail">Left Voicemail</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                <input 
                  type="date"
                  value={callForm.followUpDate}
                  onChange={(e) => setCallForm({...callForm, followUpDate: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea 
                  value={callForm.notes}
                  onChange={(e) => setCallForm({...callForm, notes: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCallForm({ outcome: '', notes: '', followUpDate: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={logCall}
                disabled={!callForm.outcome}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Log Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && selectedCompany && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log Signup</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Contact</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {getCompanyContacts(selectedCompany.id).map(contact => (
                    <div 
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={'p-3 rounded-md cursor-pointer border transition-colors ' +
                        (selectedContact?.id === contact.id 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-white border-gray-200 hover:bg-gray-50')
                      }
                    >
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📞 {contact.phone || contact.mobile || 'No phone'}
                      </div>
                      {contact.email && (
                        <div className="text-xs text-gray-500">✉️ {contact.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Attendees</label>
                <input 
                  type="number"
                  min="1"
                  value={signupForm.expectedAttendees}
                  onChange={(e) => setSignupForm({...signupForm, expectedAttendees: parseInt(e.target.value)})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Special Requirements</label>
                <input 
                  type="text"
                  value={signupForm.specialRequirements}
                  onChange={(e) => setSignupForm({...signupForm, specialRequirements: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dietary restrictions, accessibility needs..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea 
                  value={signupForm.notes}
                  onChange={(e) => setSignupForm({...signupForm, notes: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  setSignupForm({ expectedAttendees: 1, specialRequirements: '', notes: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={logSignup}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Log Signup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;