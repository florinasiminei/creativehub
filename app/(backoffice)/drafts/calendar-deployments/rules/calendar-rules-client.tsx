'use client';

import { useEffect, useState } from 'react';
import { fetchCalendarRules, createCalendarRule, updateCalendarRule, deleteCalendarRule } from '@/lib/calendar/client';
import { COUNTY_OPTIONS } from '@/lib/countyOptions';
import type { CalendarRule } from '@/lib/calendar/types';

type FormData = Partial<CalendarRule>;

export default function CalendarRulesClient() {
  const [rules, setRules] = useState<CalendarRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    judet: '',
    city: '',
    available_after_time: '',
    requires_manual_approval: true,
    allow_weekends: false,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchCalendarRules();
      setRules(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut încărca regulile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.judet) {
      setError('Județul este obligatoriu.');
      return;
    }

    try {
      if (editingId) {
        await updateCalendarRule(editingId, formData);
      } else {
        await createCalendarRule(formData);
      }
      await loadRules();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Nu am putut salva regula.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această regulă?')) return;
    try {
      await deleteCalendarRule(id);
      await loadRules();
    } catch (err: any) {
      setError(err?.message || 'Nu am putut șterge regula.');
    }
  };

  const handleEdit = (rule: CalendarRule) => {
    setFormData(rule);
    setEditingId(rule.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      judet: '',
      city: '',
      available_after_time: '',
      requires_manual_approval: true,
      allow_weekends: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="p-6 text-center">Se încarcă...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          + Adaugă regulă nouă
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Județ *</label>
              <select
                value={formData.judet || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, judet: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                required
              >
                <option value="">Selectați</option>
                {COUNTY_OPTIONS.map(county => (
                  <option key={county.slug} value={county.name}>{county.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Localitate / zonă, opțional</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Lăsați gol pentru tot județul"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Disponibil dupa ora, optional</label>
            <input
              type="time"
              value={formData.available_after_time || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, available_after_time: e.target.value || null }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <p className="mt-1 text-xs text-gray-500">Daca este gol, se foloseste ora generala din setarile calendarului.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Distanță minimă, km"
              value={formData.min_distance_km}
              onChange={(value) => setFormData(prev => ({ ...prev, min_distance_km: value }))}
            />
            <NumberField
              label="Distanță maximă, km"
              value={formData.max_distance_km}
              onChange={(value) => setFormData(prev => ({ ...prev, max_distance_km: value }))}
            />
            <NumberField
              label="Max locații pe zi"
              value={formData.max_visits_per_day}
              onChange={(value) => setFormData(prev => ({ ...prev, max_visits_per_day: value }))}
            />
            <NumberField
              label="Cost suplimentar deplasare (RON)"
              value={formData.travel_cost_supplement}
              step="0.01"
              onChange={(value) => setFormData(prev => ({ ...prev, travel_cost_supplement: value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requires_manual_approval !== false}
                onChange={(e) => setFormData(prev => ({ ...prev, requires_manual_approval: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium">Necesită aprobare manuală</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allow_weekends || false}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_weekends: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium">Permite weekend</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium">Observații interne</label>
            <textarea
              value={formData.internal_notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
              placeholder="Informații interne, nevizibile clientului."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              {editingId ? 'Actualizează' : 'Creează'}
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

      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 dark:border-zinc-800 dark:bg-zinc-800">
            Nicio regulă configurată
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 dark:border-zinc-800">
              <div>
                <div className="font-semibold">{rule.judet}{rule.city ? ` - ${rule.city}` : ''}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {rule.min_distance_km && <span>Min {rule.min_distance_km} km</span>}
                  {rule.max_distance_km && <span>Max {rule.max_distance_km} km</span>}
                  {rule.max_visits_per_day && <span>Max {rule.max_visits_per_day} locații/zi</span>}
                  {rule.available_after_time && <span>Dupa ora {rule.available_after_time}</span>}
                  {rule.allow_weekends && <span>Weekend permis</span>}
                  {rule.requires_manual_approval && <span>Aprobare manuală</span>}
                  {rule.travel_cost_supplement && <span>+{rule.travel_cost_supplement} RON</span>}
                  {rule.internal_notes && <span className="italic">Observații interne</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(rule)}
                  className="rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Editează
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Șterge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step = '1',
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  step?: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type="number"
        min="0"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
      />
    </div>
  );
}
