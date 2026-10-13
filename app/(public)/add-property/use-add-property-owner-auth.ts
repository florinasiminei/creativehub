'use client';

import { useCallback, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getOwnerSession } from '@/lib/api/ownerSession';

export type OwnerSubmissionCheck =
  | { status: 'ready'; ownerId: string; email: string }
  | { status: 'needs-confirmation'; email: string };

export default function useAddPropertyOwnerAuth(session: Session) {
  const ownerId = session.user.id;
  const activeOwnerEmail = session.user.email?.trim().toLowerCase() || '';
  const ownerIdentity = `${ownerId}:${activeOwnerEmail}`;
  const [confirmedOwnerIdentity, setConfirmedOwnerIdentity] = useState<string | null>(null);
  const [switchingOwnerAccount, setSwitchingOwnerAccount] = useState(false);
  const switchingOwnerAccountRef = useRef(false);
  const activeOwnerConfirmed = confirmedOwnerIdentity === ownerIdentity;

  const setActiveOwnerConfirmed = useCallback((confirmed: boolean) => {
    setConfirmedOwnerIdentity(confirmed ? ownerIdentity : null);
  }, [ownerIdentity]);

  const checkOwnerForSubmission = useCallback(async (): Promise<OwnerSubmissionCheck> => {
    const currentSession = await getOwnerSession(ownerId);
    const email = currentSession.user.email?.trim().toLowerCase() || '';
    if (!email || !currentSession.user.email_confirmed_at || currentSession.user.is_anonymous) {
      throw new Error('Confirmă emailul contului de proprietar înainte de trimitere.');
    }
    if (email !== activeOwnerEmail) {
      throw new Error('Emailul contului s-a schimbat. Reîncarcă pagina înainte de trimitere.');
    }
    if (!activeOwnerConfirmed) return { status: 'needs-confirmation', email };

    return { status: 'ready', ownerId, email };
  }, [activeOwnerConfirmed, activeOwnerEmail, ownerId]);

  const switchOwnerAccount = useCallback(async (busy: boolean) => {
    if (busy || switchingOwnerAccountRef.current) return false;

    switchingOwnerAccountRef.current = true;
    setSwitchingOwnerAccount(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setConfirmedOwnerIdentity(null);
      return true;
    } finally {
      switchingOwnerAccountRef.current = false;
      setSwitchingOwnerAccount(false);
    }
  }, []);

  return {
    activeOwnerEmail,
    activeOwnerConfirmed,
    setActiveOwnerConfirmed,
    switchingOwnerAccount,
    checkOwnerForSubmission,
    switchOwnerAccount,
  };
}
