import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { motion } from 'motion/react';
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
          : 'Gagal memuat Daftar Anggota. Silakan coba muat ulang.';
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

  const tabs: { id: ActiveTab; label: string; count?: number; icon: typeof UserPlus }[] = [
    { id: 'signup', label: 'Pendaftaran', count: signups.length, icon: UserPlus },
    { id: 'roster', label: 'Susunan Team', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="max-w-2xl mx-auto text-center space-y-1.5">
          <p className="text-sm font-bold tracking-wide text-[#3730A3]">
            JAVA GLITCH · Ragnarok: The New World
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Pendataan Guild League &amp; Polarity
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Daftarkan nick in game, pilih job, dan atur susunan team dari Daftar Anggota.
          </p>
        </header>

        <nav aria-label="Menu utama" className="max-w-lg mx-auto">
          <div
            role="tablist"
            className="grid grid-cols-2 gap-2 p-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm"
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  whileHover={{ scale: isSelected ? 1 : 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative min-h-[52px] px-4 py-2.5 rounded-xl text-sm sm:text-base font-bold whitespace-nowrap transition-colors duration-150 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'text-white'
                      : 'text-slate-700 hover:text-[#3730A3] hover:bg-slate-50'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="active-main-tab-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-[#3730A3] shadow-md shadow-indigo-950/20"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Icon aria-hidden="true" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-xs sm:text-sm font-bold tabular-nums ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        ({tab.count})
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </nav>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'signup' ? (
            <div className="max-w-2xl mx-auto space-y-8 sm:space-y-10">
              <RegistrationForm onSuccess={refreshAll} />

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
        </motion.div>
      </main>
    </div>
  );
}
