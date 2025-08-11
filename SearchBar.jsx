import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap items-center gap-4">
      {/* Search Input */}
      <div className="flex-grow min-w-[200px] max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search companies or contacts..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Status Filter */}
      <div>
        <select
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="signed_up">Signed Up</option>
          <option value="not_interested">Not Interested</option>
        </select>
      </div>
      
      {/* Priority Filter */}
      <div>
        <select
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      
      {/* Reset Filters */}
      <div>
        <button
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
            setPriorityFilter('');
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
