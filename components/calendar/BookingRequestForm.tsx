'use client';

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createBookingRequest,
  fetchCalendarAvailability,
  fetchCalendarSettings as fetchCalendarSettingsClient,
  toDateInputValue,
  formatRoDate,
} from '@/lib/calendar/client';
import type { BookingRequestSubmission, CalendarAvailability } from '@/lib/calendar/types';
import PublicAvailabilityCalendar from '@/components/calendar/PublicAvailabilityCalendar';
import useCountyLocalityData from '@/hooks/useCountyLocalityData';

type FormState = {
  property_name: string;
  contact_name: string;
  phone: string;
  judet: string;
  city: string;
  sat: string;
  preferred_date: string;
  booking_link: string;
  airbnb_link: string;
  facebook_link: string;
  site_link: string;
  notes: string;
};

const INITIAL_STATE: FormState = {
  property_name: '',
  contact_name: '',
  phone: '',
  judet: '',
  city: '',
  sat: '',
  preferred_date: '',
  booking_link: '',
  airbnb_link: '',
  facebook_link: '',
  site_link: '',
  notes: '',
};

type Props = {
  onSuccess?: () => void;
};

export default function BookingRequestForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [minDaysBeforeBooking, setMinDaysBeforeBooking] = useState(3);
  const [availability, setAvailability] = useState<CalendarAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    locationsError,
    filteredCounties,
    filteredLocalities,
    resolvedCounty,
    resolvedLocality,
    countyHasMatch,
    localityHasMatch,
  } = useCountyLocalityData(formData.judet, formData.city);

  useEffect(() => {
    let cancelled = false;
    fetchCalendarSettingsClient()
      .then((settings) => {
        if (!cancelled && Number.isFinite(settings.min_days_before_booking)) {
          setMinDaysBeforeBooking(settings.min_days_before_booking);
        }
      })
      .catch(() => {
        if (!cancelled) setMinDaysBeforeBooking(3);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAvailability(null);
    setFormData(prev => ({ ...prev, preferred_date: '' }));

    if (!formData.judet || !formData.city || !countyHasMatch || !localityHasMatch) return;

    setAvailabilityLoading(true);
    fetchCalendarAvailability({ judet: formData.judet, city: formData.city, days: 45 })
      .then((data) => {
        if (cancelled) return;
        setAvailability(data);
        setMinDaysBeforeBooking(data.min_days_before_booking);
      })
      .catch(() => {
        if (!cancelled) setError('Nu am putut incarca disponibilitatea pentru locatia selectata.');
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.judet, formData.city, countyHasMatch, localityHasMatch]);

  const availableDates = useMemo(
    () => availability?.days.filter(day => day.available).map(day => day.date) || [],
    [availability]
  );
  const selectedDay = availability?.days.find(day => day.date === formData.preferred_date) || null;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'judet' ? { city: '', sat: '', preferred_date: '' } : {}),
      ...(name === 'city' ? { preferred_date: '' } : {}),
    }));
    if (error) setError(null);
  };

  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, preferred_date: date }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.judet) throw new Error('Selectati judetul.');
      if (!formData.city) throw new Error('Selectati localitatea.');
      if (!formData.property_name.trim()) throw new Error('Introduceti numele cazarii.');
      if (!formData.contact_name.trim()) throw new Error('Introduceti numele persoanei de contact.');
      if (!formData.phone.trim()) throw new Error('Introduceti numarul de telefon.');
      if (formData.phone.replace(/\D/g, '').length < 10) throw new Error('Numarul de telefon pare incomplet.');
      if (!formData.preferred_date) throw new Error('Selectati o data preferata.');
      if (formData.preferred_date < minDateStr) {
        throw new Error(`Alegeti o data cu cel putin ${minDaysBeforeBooking} zile in avans.`);
      }
      if (availability && selectedDay && !selectedDay.available) {
        throw new Error('Data selectata nu mai este disponibila. Alegeti alta data.');
      }

      const external_links = [];
      if (formData.booking_link.trim()) external_links.push({ platform: 'booking' as const, url: formData.booking_link.trim() });
      if (formData.airbnb_link.trim()) external_links.push({ platform: 'airbnb' as const, url: formData.airbnb_link.trim() });
      if (formData.facebook_link.trim()) external_links.push({ platform: 'facebook' as const, url: formData.facebook_link.trim() });
      if (formData.site_link.trim()) external_links.push({ platform: 'site' as const, url: formData.site_link.trim() });

      const submission: BookingRequestSubmission = {
        property_name: formData.property_name.trim(),
        contact_name: formData.contact_name.trim(),
        phone: formData.phone.trim(),
        judet: formData.judet,
        city: formData.city.trim(),
        sat: formData.sat.trim() || undefined,
        preferred_date: formData.preferred_date,
        external_links: external_links.length > 0 ? external_links : undefined,
        notes: formData.notes.trim() || undefined,
      };

      await createBookingRequest(submission);

      setSuccess(true);
      setFormData(INITIAL_STATE);
      setAvailability(null);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err?.message || 'A aparut o eroare.');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + minDaysBeforeBooking);
  const minDateStr = toDateInputValue(minDate);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
          Cerere trimisa cu succes. Va vom contacta pentru confirmare.
        </div>
      )}

      {(error || locationsError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {error || locationsError}
        </div>
      )}

      <fieldset className="space-y-6" disabled={loading}>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            1. Unde este cazarea?
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="judet" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Judet *
              </label>
              <select
                id="judet"
                name="judet"
                value={resolvedCounty || formData.judet}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              >
                <option value="">Selectati judetul</option>
                {filteredCounties.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Localitate *
              </label>
              <select
                id="city"
                name="city"
                value={resolvedLocality || formData.city}
                onChange={handleChange}
                disabled={!formData.judet}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm disabled:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:disabled:bg-zinc-900"
                required
              >
                <option value="">Selectati localitatea</option>
                {filteredLocalities.map((locality) => (
                  <option key={locality.nume} value={locality.nume}>
                    {locality.nume}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="sat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sat / zona
            </label>
            <input
              type="text"
              id="sat"
              name="sat"
              value={formData.sat}
              onChange={handleChange}
              placeholder="Ex: Poiana Brasov"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>

        {formData.judet && formData.city && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              2. Alegeti data preferata
            </h3>
            {availabilityLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Se verifica disponibilitatea...</p>
            ) : (
              <>
                {availability && (
                  <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                    Pentru locatia selectata primim cereri dupa ora {availability.available_after_time}. Data nu este confirmata automat.
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data preferata *
                </label>
                {availability && availability.days.length > 0 ? (
                  <div className="mt-2">
                    <PublicAvailabilityCalendar
                      days={availability.days}
                      selectedDate={formData.preferred_date}
                      minDate={minDateStr}
                      onDateSelect={handleDateSelect}
                    />
                    {formData.preferred_date && (
                      <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Data selectata: <span className="font-semibold">{formatRoDate(formData.preferred_date)}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="date"
                      id="preferred_date"
                      name="preferred_date"
                      value={formData.preferred_date}
                      onChange={handleChange}
                      min={minDateStr}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Minim {minDaysBeforeBooking} zile de la trimiterea cererii.
                    </p>
                  </>
                )}
                {!availability && availableDates.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Urmatoarele date disponibile: {availableDates.slice(0, 5).map(formatRoDate).join(', ')}.
                  </p>
                )}
                {selectedDay && !selectedDay.available && (
                  <p className="mt-2 text-sm text-red-600">{selectedDay.reason || 'Data indisponibila.'}</p>
                )}
              </>
            )}
          </div>
        )}

        {formData.judet && formData.city && formData.preferred_date && (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                3. Date de contact
              </h3>
              <div className="space-y-4">
                <TextField name="property_name" label="Numele cazarii *" value={formData.property_name} onChange={handleChange} placeholder="Ex: Casa Lui Gheorghe" required />
                <TextField name="contact_name" label="Nume persoana de contact *" value={formData.contact_name} onChange={handleChange} placeholder="Ex: Gheorghe Popescu" required />
                <TextField name="phone" type="tel" label="Telefon *" value={formData.phone} onChange={handleChange} placeholder="Ex: 0721 234 567" required />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Link cazare, optional
              </h3>
              <div className="space-y-4">
                <TextField name="booking_link" type="url" value={formData.booking_link} onChange={handleChange} placeholder="Link Booking.com" />
                <TextField name="airbnb_link" type="url" value={formData.airbnb_link} onChange={handleChange} placeholder="Link Airbnb" />
                <TextField name="facebook_link" type="url" value={formData.facebook_link} onChange={handleChange} placeholder="Link Facebook" />
                <TextField name="site_link" type="url" value={formData.site_link} onChange={handleChange} placeholder="Link site propriu" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Observatii, optional
              </h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ex: interval preferat, detalii de acces, persoana de contact alternativa."
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedDay || !selectedDay.available}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {loading ? 'Se trimite...' : 'Trimite cerere de programare'}
            </button>
          </>
        )}
      </fieldset>
    </form>
  );
}

function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  name: string;
  label?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        required={required}
      />
    </div>
  );
}
