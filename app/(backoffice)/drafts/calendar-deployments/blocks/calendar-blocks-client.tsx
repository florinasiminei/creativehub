'use client';

import { useEffect, useState } from 'react';
import { fetchCalendarBlocks, createCalendarBlock, deleteCalendarBlock } from '@/lib/calendar/client';
import type { CalendarBlock } from '@/lib/calendar/types';

type FormData = {
  start_date: string;
  end_date: string;
  reason: string;
};

export default function CalendarBlocksClient() {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const data = await fetchCalendarBlocks();
      setBlocks(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.start_date || !formData.end_date || !formData.reason) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }

    if (formData.start_date > formData.end_date) {
      setError('Data de început trebuie să fie înainte de data de sfârşit');
      return;
    }

    try {
      await createCalendarBlock(formData);
      await loadBlocks();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to create block');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sunteți sigur că doriți să deblocați aceste zile?')) return;
    try {
      await deleteCalendarBlock(id);
      await loadBlocks();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete block');
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: '',
      end_date: '',
      reason: '',
    });
    setShowForm(false);
  };

  const getUpcomingBlocksCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return blocks.filter(b => b.end_date >= today).length;
  };

  if (loading) return <div className="p-6 text-center">Încarcă...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/40">
          <div className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
            Zile blocate viitoare
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-100">
            {getUpcomingBlocksCount()}
          </div>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/40">
          <div className="text-xs font-semibold uppercase text-orange-700 dark:text-orange-300">
            Total blocări
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-900 dark:text-orange-100">
            {blocks.length}
          </div>
        </div>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          + Blochează perioada nouă
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">De la (data) *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Până la (data) *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Motiv *</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ex: Vacanță, întreținere, curs de formare..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Blochează zile
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Blocks List */}
      <div className="space-y-2">
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 dark:border-zinc-800 dark:bg-zinc-800">
            Nicio perioadă blocată
          </div>
        ) : (
          blocks.map(block => {
            const startDate = new Date(block.start_date);
            const endDate = new Date(block.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = endDate < today;

            return (
              <div
                key={block.id}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  isPast
                    ? 'border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-800/50'
                    : 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/40'
                }`}
              >
                <div>
                  <div className="font-semibold">{block.reason}</div>
                  <div className={`mt-1 text-sm ${isPast ? 'text-gray-600 dark:text-gray-400' : 'text-orange-700 dark:text-orange-200'}`}>
                    {startDate.toLocaleDateString('ro-RO')} – {endDate.toLocaleDateString('ro-RO')}
                  </div>
                  {block.blocked_by && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Blocat de: {block.blocked_by}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(block.id)}
                  className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Deblocheaza
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
