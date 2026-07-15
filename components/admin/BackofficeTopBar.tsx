"use client";

type Props = {
  onHamburgerClick: () => void;
};

export default function BackofficeTopBar({ onHamburgerClick }: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 sm:px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 lg:px-8">
      <button
        type="button"
        onClick={onHamburgerClick}
        className="lg:hidden mr-3 p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="lg:hidden text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-400">CABN Admin</span>
    </header>
  );
}
