import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="mt-8 mb-6">
      <p className="text-[11px] text-text-gray text-center mb-4">
        Swipe or use arrows to navigate between pages
      </p>
      
      <div className="flex items-center justify-center gap-4">
        {/* Previous Button */}
        <button
          onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            canGoPrevious
              ? 'bg-gray-100 hover:bg-gray-200 text-text-dark'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Indicator */}
        <div className="text-sm font-medium text-text-dark">
          Page <span className="font-bold">{currentPage}</span> of {totalPages}
        </div>

        {/* Next Button */}
        <button
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            canGoNext
              ? 'bg-gray-100 hover:bg-gray-200 text-text-dark'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
