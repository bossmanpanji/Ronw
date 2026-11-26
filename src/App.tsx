import { useCallback, useEffect, useState } from 'react';
import { RegistrationForm } from './components/RegistrationForm';
import { SignupList } from './components/SignupList';
import { TeamRosterTab } from './components/TeamRosterTab';
import { fetchGuildLeagueSignups, fetchGuildLeagueTeamSlots } from './lib/supabase';
import type { GuildLeagueSignup, GuildLeagueTeamSlot } from './types/signup';

type ActiveTab = 'signup' | 'roster';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('signup');

  const [signups, setSignups] = useState<GuildLeagueSignup[]>([]);
  const [isSignupsLoading, setIsSignupsLoading] = useState(true);
  const [signupsError, setSignupsError] = useState<string | null>(null);

  const [teamSlots, setTeamSlots] = useState<GuildLeagueTeamSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const loadSignups = useCallback(async () => {
    setIsSignupsLoading(true);
    setSignupsError(null);
    try {
      const data = await fetchGuildLeagueSignups();
      setSignups(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memuat daftar pendaftar. Silakan coba muat ulang.';
      setSignupsError(message);
    } finally {
      setIsSignupsLoading(false);
    }
  }, []);

  const loadTeamSlots = useCallback(async () => {
    setIsSlotsLoading(true);
    setSlotsError(null);
    try {
      const data = await fetchGuildLeagueTeamSlots();
      setTeamSlots(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memuat susunan team. Silakan coba muat ulang.';
      setSlotsError(message);
    } finally {
      setIsSlotsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSignups(), loadTeamSlots()]);
  }, [loadSignups, loadTeamSlots]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="max-w-2xl mx-auto text-center space-y-1.5">
          <p className="text-sm font-semibold text-[#3730A3]">Ragnarok: The New World</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Pendataan Event Guild League
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Daftarkan nick in game, pilih job, dan atur susunan team dari daftar pendaftar.
          </p>
        </header>

        <nav aria-label="Menu utama" className="max-w-md mx-auto">
          <div
            role="tablist"
            className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              onClick={() => setActiveTab('signup')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm sm:text-base font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] ${
                activeTab === 'signup'
                  ? 'bg-white text-[#3730A3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendaftaran ({signups.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'roster'}
              onClick={() => setActiveTab('roster')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm sm:text-base font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] ${
                activeTab === 'roster'
                  ? 'bg-white text-[#3730A3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Susunan Team
            </button>
          </div>
        </nav>

        {activeTab === 'signup' ? (
          <div className="space-y-8 sm:space-y-10">
            <div className="max-w-2xl mx-auto">
              <RegistrationForm onSuccess={refreshAll} />
            </div>

            <SignupList
              signups={signups}
              isLoading={isSignupsLoading}
              error={signupsError}
              onRefresh={refreshAll}
            />
          </div>
        ) : (
          <TeamRosterTab
            signups={signups}
            teamSlots={teamSlots}
            isLoading={isSignupsLoading || isSlotsLoading}
            error={slotsError ?? signupsError}
            onRefresh={refreshAll}
          />
        )}
      </main>
    </div>
  );
}
