"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  const visiblePages = pages.filter(page => {
    if (totalPages <= 7) return true;
    if (page === 1 || page === totalPages) return true;
    if (Math.abs(page - currentPage) <= 1) return true;
    return false;
  });

  return (
    <div className="flex justify-center items-center gap-2 my-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800 transition-all"
        title="Pagina anterioară"
      >
        ⬅️
      </button>
      
      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        if (prevPage && page - prevPage > 1) {
          return (
            <div key={`gap-${page}`} className="flex items-center gap-2">
              <span className="text-gray-400 px-2">•••</span>
              <button
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded-lg border ${
                  currentPage === page
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-gray-300 hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                }`}
              >
                {page}
              </button>
            </div>
          );
        }
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg border ${
              currentPage === page
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-gray-300 hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            }`}
          >
            {page}
          </button>
        );
      })}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800 transition-all"
        title="Pagina următoare"
      >
        ➡️
      </button>
    </div>
  );
}