'use client';

import { useEffect, useState } from 'react';
import {
  fetchCalendarSettings,
  updateCalendarSettings,
  fetchCalendarRules,
  createCalendarRule,
  updateCalendarRule,
  deleteCalendarRule,
  fetchCalendarBlocks,
  createCalendarBlock,
  updateCalendarBlock,
  deleteCalendarBlock,
} from '@/lib/calendar/client';
import { COUNTY_OPTIONS } from '@/lib/countyOptions';
import type { CalendarSettings, CalendarRule, CalendarBlock } from '@/lib/calendar/types';

type SettingsTab = 'general' | 'rules' | 'blocks';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS: Record<string, string> = {
  Monday: 'Luni',
  Tuesday: 'Marti',
  Wednesday: 'Miercuri',
  Thursday: 'Joi',
  Friday: 'Vineri',
  Saturday: 'Sambata',
  Sunday: 'Duminica',
};

export default function CalendarSettingsUnified() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>Setari generale</TabButton>
        <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>Reguli locatie</TabButton>
        <TabButton active={activeTab === 'blocks'} onClick={() => setActiveTab('blocks')}>Zile blocate</TabButton>
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'rules' && <RulesSection />}
      {activeTab === 'blocks' && <BlocksSection />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    available_days: [] as string[],
    available_after_time: '10:00',
    max_visits_per_day: 1,
    min_days_before_booking: 3,
    auto_confirm: false,
    manual_confirmation_required: true,
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchCalendarSettings();
      setFormData({
        available_days: data.available_days || [],
        available_after_time: data.available_after_time || data.available_hours?.[0] || '10:00',
        max_visits_per_day: data.max_visits_per_day || 1,
        min_days_before_booking: data.min_days_before_booking || 3,
        auto_confirm: data.auto_confirm,
        manual_confirmation_required: data.manual_confirmation_required,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut incarca setarile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateCalendarSettings({
        ...formData,
        available_hours: [formData.available_after_time],
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut salva setarile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day],
    }));
  };

  if (loading) return <div className="p-6 text-center">Se incarca...</div>;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message="Setari salvate cu succes." />}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold">Setari generale</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">Disponibil dupa ora</label>
            <input
              type="time"
              value={formData.available_after_time}
              onChange={(e) => setFormData(prev => ({ ...prev, available_after_time: e.target.value }))}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <p className="mt-1 text-xs text-gray-500">Clientul vede ca cererea poate fi facuta dupa ora setata.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Max locatii pe zi</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.max_visits_per_day}
              onChange={(e) => setFormData(prev => ({ ...prev, max_visits_per_day: Number(e.target.value) }))}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <p className="mt-1 text-xs text-gray-500">Pentru CABN, valoarea recomandata este 1.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Zile minime de avans</label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.min_days_before_booking}
              onChange={(e) => setFormData(prev => ({ ...prev, min_days_before_booking: Number(e.target.value) }))}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-zinc-800">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.manual_confirmation_required}
              onChange={(e) => setFormData(prev => ({ ...prev, manual_confirmation_required: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Necesita confirmare manuala</span>
          </label>

          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={formData.auto_confirm}
              onChange={(e) => setFormData(prev => ({ ...prev, auto_confirm: e.target.checked }))}
              disabled={formData.manual_confirmation_required}
              className="rounded"
            />
            <span className="text-sm font-medium">Confirmare automata cand nu este ceruta confirmarea manuala</span>
          </label>

          <p className="text-xs text-gray-500">
            Regulile pe locatie pot suprascrie aceste setari. De exemplu, o regula poate cere aprobare manuala chiar daca aici e setata confirmarea automata.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold">Zile disponibile</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DAYS.map(day => (
            <label key={day} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={formData.available_days.includes(day)}
                onChange={() => toggleDay(day)}
                className="rounded"
              />
              <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Se salveaza...' : 'Salveaza setari'}
        </button>
      </div>
    </div>
  );
}

function RulesSection() {
  const [rules, setRules] = useState<CalendarRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CalendarRule>>({
    judet: '',
    city: '',
    available_after_time: '',
    requires_manual_approval: true,
    allow_weekends: false,
  });

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchCalendarRules();
      setRules(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut incarca regulile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.judet) { setError('Judetul este obligatoriu.'); return; }

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
    if (!confirm('Sigur doriti sa stergeti aceasta regula?')) return;
    try {
      await deleteCalendarRule(id);
      await loadRules();
    } catch (err: any) {
      setError(err?.message || 'Nu am putut sterge regula.');
    }
  };

  const handleEdit = (rule: CalendarRule) => {
    setFormData(rule);
    setEditingId(rule.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ judet: '', city: '', available_after_time: '', requires_manual_approval: true, allow_weekends: false });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="p-6 text-center">Se incarca...</div>;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          + Adauga regula noua
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Judet *</label>
              <select
                value={formData.judet || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, judet: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                required
              >
                <option value="">Selectati</option>
                {COUNTY_OPTIONS.map(county => (
                  <option key={county.slug} value={county.name}>{county.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Localitate / zona, optional</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Lasa gol pentru tot judetul"
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
            <NumberField label="Distanta minima, km" value={formData.min_distance_km} onChange={(value) => setFormData(prev => ({ ...prev, min_distance_km: value }))} />
            <NumberField label="Distanta maxima, km" value={formData.max_distance_km} onChange={(value) => setFormData(prev => ({ ...prev, max_distance_km: value }))} />
            <NumberField label="Max locatii pe zi" value={formData.max_visits_per_day} onChange={(value) => setFormData(prev => ({ ...prev, max_visits_per_day: value }))} />
            <NumberField label="Cost suplimentar deplasare (RON)" value={formData.travel_cost_supplement} step="0.01" onChange={(value) => setFormData(prev => ({ ...prev, travel_cost_supplement: value }))} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.requires_manual_approval !== false} onChange={(e) => setFormData(prev => ({ ...prev, requires_manual_approval: e.target.checked }))} className="rounded" />
              <span className="text-sm font-medium">Necesita aprobare manuala</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.allow_weekends || false} onChange={(e) => setFormData(prev => ({ ...prev, allow_weekends: e.target.checked }))} className="rounded" />
              <span className="text-sm font-medium">Permite weekend</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium">Observatii interne</label>
            <textarea
              value={formData.internal_notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
              placeholder="Informatii interne, nevizibile clientului."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
              {editingId ? 'Actualizeaza' : 'Creeaza'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Anuleaza
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 dark:border-zinc-800 dark:bg-zinc-800">
            Nicio regula configurata
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 dark:border-zinc-800">
              <div>
                <div className="font-semibold">{rule.judet}{rule.city ? ` - ${rule.city}` : ''}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {rule.available_after_time && <span>Dupa ora {rule.available_after_time}</span>}
                  {rule.max_visits_per_day && <span>Max {rule.max_visits_per_day} locatii/zi</span>}
                  {rule.allow_weekends && <span>Weekend permis</span>}
                  {rule.requires_manual_approval && <span>Aprobare manuala</span>}
                  {rule.travel_cost_supplement != null && rule.travel_cost_supplement > 0 && <span>+{rule.travel_cost_supplement} RON</span>}
                  {rule.internal_notes && <span className="italic">Observatii interne</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleEdit(rule)} className="rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
                  Editeaza
                </button>
                <button type="button" onClick={() => handleDelete(rule.id)} className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30">
                  Sterge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BlocksSection() {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ start_date: '', end_date: '', reason: '' });

  useEffect(() => { loadBlocks(); }, []);

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
    if (!formData.start_date || !formData.end_date || !formData.reason) { setError('Toate campurile sunt obligatorii'); return; }
    if (formData.start_date > formData.end_date) { setError('Data de inceput trebuie sa fie inainte de data de sfarsit'); return; }

    try {
      if (editingId) {
        await updateCalendarBlock(editingId, formData);
      } else {
        await createCalendarBlock(formData);
      }
      await loadBlocks();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save block');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sunteti sigur ca doriti sa deblocati aceste zile?')) return;
    try { await deleteCalendarBlock(id); await loadBlocks(); } catch (err: any) { setError(err?.message || 'Failed to delete block'); }
  };

  const handleEdit = (block: CalendarBlock) => {
    setFormData({ start_date: block.start_date, end_date: block.end_date, reason: block.reason });
    setEditingId(block.id);
    setShowForm(true);
  };

  const resetForm = () => { setFormData({ start_date: '', end_date: '', reason: '' }); setEditingId(null); setShowForm(false); };

  if (loading) return <div className="p-6 text-center">Se incarca...</div>;

  const upcomingCount = blocks.filter(b => b.end_date >= new Date().toISOString().split('T')[0]).length;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/40">
          <div className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">Zile blocate viitoare</div>
          <div className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-100">{upcomingCount}</div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/40">
          <div className="text-xs font-semibold uppercase text-orange-700 dark:text-orange-300">Total blocari</div>
          <div className="mt-2 text-3xl font-bold text-orange-900 dark:text-orange-100">{blocks.length}</div>
        </div>
      </div>

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          + Blocheaza perioada noua
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">De la (data) *</label>
              <input type="date" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Pana la (data) *</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Motiv *</label>
            <input type="text" value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Ex: Vacanta, intretinere..." className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" required />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
              {editingId ? 'Actualizeaza' : 'Blocheaza zile'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Anuleaza
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 dark:border-zinc-800 dark:bg-zinc-800">
            Nicio perioada blocata
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
                  isPast ? 'border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-800/50' : 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/40'
                }`}
              >
                <div>
                  <div className="font-semibold">{block.reason}</div>
                  <div className={`mt-1 text-sm ${isPast ? 'text-gray-600 dark:text-gray-400' : 'text-orange-700 dark:text-orange-200'}`}>
                    {startDate.toLocaleDateString('ro-RO')} - {endDate.toLocaleDateString('ro-RO')}
                  </div>
                  {block.blocked_by && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Blocat de: {block.blocked_by}</div>}
                </div>
                <div className="flex gap-2">
                  {!isPast && (
                    <button type="button" onClick={() => handleEdit(block)} className="rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
                      Editeaza
                    </button>
                  )}
                  <button type="button" onClick={() => handleDelete(block.id)} className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30">
                    Deblocheaza
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NumberField({ label, value, step = '1', onChange }: { label: string; value: number | null | undefined; step?: string; onChange: (value: number | null) => void }) {
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

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40">{message}</div>;
}

function SuccessBanner({ message }: { message: string }) {
  return <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40">{message}</div>;
}
