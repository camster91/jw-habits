import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { BookHeart, Search, Calendar, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import useMemoriesStore from '../stores/memoriesStore';
import { haptics } from '../utils/native';

function Memories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [expandedReflection, setExpandedReflection] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { getAllReflections, getReflectionsByMonth, searchReflections, deleteReflection, getReflectionCount } = useMemoriesStore();

  const totalCount = getReflectionCount();

  // Get reflections based on search or month filter
  const reflections = useMemo(() => {
    if (searchQuery.trim()) {
      return searchReflections(searchQuery);
    }
    return getReflectionsByMonth(selectedMonth.year, selectedMonth.month);
  }, [searchQuery, selectedMonth, searchReflections, getReflectionsByMonth]);

  const handlePrevMonth = () => {
    haptics.light();
    setSelectedMonth(prev => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    haptics.light();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Don't go past current month
    if (selectedMonth.year === currentYear && selectedMonth.month >= currentMonth) {
      return;
    }

    setSelectedMonth(prev => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDelete = (date) => {
    haptics.medium();
    deleteReflection(date);
    setDeleteConfirm(null);
    setExpandedReflection(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth() + 1;
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <BookHeart className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">My Reflections</h1>
            <p className="text-sm opacity-90">{totalCount} memories saved</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
          <input
            type="text"
            placeholder="Search your reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-base-content/40" />
            </button>
          )}
        </div>

        {/* Month Navigation (hidden when searching) */}
        {!searchQuery && (
          <div className="flex items-center justify-between bg-base-100 rounded-xl p-3 shadow">
            <button
              onClick={handlePrevMonth}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-semibold">
                {monthNames[selectedMonth.month - 1]} {selectedMonth.year}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className={`btn btn-ghost btn-sm btn-circle ${isCurrentMonth() ? 'invisible' : ''}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search Results Label */}
        {searchQuery && (
          <p className="text-sm text-base-content/60">
            Found {reflections.length} reflection{reflections.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}

        {/* Reflections List */}
        {reflections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <BookHeart className="w-8 h-8 text-pink-400" />
            </div>
            <p className="font-medium text-base-content/70">
              {searchQuery
                ? 'No reflections found'
                : 'No reflections this month'}
            </p>
            <p className="text-sm text-base-content/50 mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Write a reflection on the Daily Text to see it here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reflections.map((reflection) => {
              const isExpanded = expandedReflection === reflection.date;
              const dateObj = parseISO(reflection.date);

              return (
                <div
                  key={reflection.date}
                  className="card bg-base-100 shadow-sm"
                >
                  <div className="card-body p-4">
                    {/* Header */}
                    <button
                      onClick={() => {
                        haptics.light();
                        setExpandedReflection(isExpanded ? null : reflection.date);
                      }}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div>
                        <p className="font-semibold">
                          {format(dateObj, 'EEEE, MMMM d')}
                        </p>
                        <p className="text-xs text-base-content/50">
                          {format(dateObj, 'yyyy')}
                        </p>
                      </div>
                      <div className="badge badge-ghost">
                        {reflection.content.length} chars
                      </div>
                    </button>

                    {/* Content Preview or Full */}
                    <p className={`text-base-content/70 mt-2 ${!isExpanded && 'line-clamp-3'}`}>
                      {reflection.content}
                    </p>

                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-base-200">
                        <p className="text-xs text-base-content/40">
                          Last updated: {format(parseISO(reflection.updatedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {deleteConfirm === reflection.date ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-error">Delete?</span>
                            <button
                              onClick={() => handleDelete(reflection.date)}
                              className="btn btn-error btn-xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="btn btn-ghost btn-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              haptics.light();
                              setDeleteConfirm(reflection.date);
                            }}
                            className="btn btn-ghost btn-xs text-error"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Memories;
