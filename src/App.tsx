import { useCallback, useEffect, useState } from 'react';
import { Shield, UserPlus, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { JobSummaryCard } from './components/JobSummaryCard';
import { PartyTetapTab } from './components/PartyTetapTab';
import { RegistrationForm } from './components/RegistrationForm';
import { SignupList } from './components/SignupList';
import { TeamRosterTab } from './components/TeamRosterTab';
import { Toast, type ToastData } from './components/Toast';
import {
  fetchGuildLeagueFixedParties,
  fetchGuildLeagueFixedPartySlots,
  fetchGuildLeagueRosterTitles,
  fetchGuildLeagueSignups,
  fetchGuildLeagueTeamSlots,
} from './lib/supabase';
import type {
  GuildLeagueFixedParty,
  GuildLeagueFixedPartySlot,
  GuildLeagueRosterTitle,
  GuildLeagueSignup,
  GuildLeagueTeamSlot,
} from './types/signup';

type ActiveTab = 'signup' | 'roster' | 'party';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('signup');
  const [toast, setToast] = useState<ToastData | null>(null);

  const [signups, setSignups] = useState<GuildLeagueSignup[]>([]);
  const [isSignupsLoading, setIsSignupsLoading] = useState(true);
  const [signupsError, setSignupsError] = useState<string | null>(null);

  const [teamSlots, setTeamSlots] = useState<GuildLeagueTeamSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [fixedParties, setFixedParties] = useState<GuildLeagueFixedParty[]>([]);
  const [fixedPartySlots, setFixedPartySlots] = useState<GuildLeagueFixedPartySlot[]>([]);
  const [isPartiesLoading, setIsPartiesLoading] = useState(true);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  const [rosterTitles, setRosterTitles] = useState<GuildLeagueRosterTitle[]>([]);

  const showToast = useCallback((nextToast: Omit<ToastData, 'id'>) => {
    setToast({
      id: Date.now(),
      ...nextToast,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

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

  const loadFixedParties = useCallback(async () => {
    setIsPartiesLoading(true);
    setPartiesError(null);
    try {
      const [partiesData, slotsData] = await Promise.all([
        fetchGuildLeagueFixedParties(),
        fetchGuildLeagueFixedPartySlots(),
      ]);
      setFixedParties(partiesData);
      setFixedPartySlots(slotsData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memuat daftar party tetap. Silakan coba muat ulang.';
      setPartiesError(message);
    } finally {
      setIsPartiesLoading(false);
    }
  }, []);

  const loadRosterTitles = useCallback(async () => {
    try {
      const data = await fetchGuildLeagueRosterTitles();
      setRosterTitles(data);
    } catch {
      // Keep existing labels if custom titles fail to load silently
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSignups(),
      loadTeamSlots(),
      loadFixedParties(),
      loadRosterTitles(),
    ]);
  }, [loadSignups, loadTeamSlots, loadFixedParties, loadRosterTitles]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const tabs: { id: ActiveTab; label: string; count?: number; icon: typeof UserPlus }[] = [
    { id: 'signup', label: 'List Anggota', count: signups.length, icon: UserPlus },
    { id: 'roster', label: 'Susunan Team', icon: Users },
    { id: 'party', label: 'Party Tetap', count: fixedParties.length, icon: Shield },
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

        <nav aria-label="Menu utama" className="max-w-2xl mx-auto">
          <div
            role="tablist"
            className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm"
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
                  className={`relative min-h-[48px] sm:min-h-[52px] px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-bold whitespace-nowrap transition-colors duration-150 flex items-center justify-center gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 ${
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
                  <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2 min-w-0">
                    <Icon aria-hidden="true" className="hidden sm:block w-5 h-5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[11px] sm:text-sm font-bold tabular-nums shrink-0 ${
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
              <RegistrationForm onSuccess={refreshAll} onNotify={showToast} />

              <JobSummaryCard signups={signups} isLoading={isSignupsLoading} />

              <SignupList
                signups={signups}
                isLoading={isSignupsLoading}
                error={signupsError}
                onRefresh={refreshAll}
              />
            </div>
          ) : activeTab === 'roster' ? (
            <TeamRosterTab
              signups={signups}
              teamSlots={teamSlots}
              rosterTitles={rosterTitles}
              isLoading={isSignupsLoading || isSlotsLoading}
              error={slotsError ?? signupsError}
              onRefresh={refreshAll}
              onNotify={showToast}
            />
          ) : (
            <PartyTetapTab
              signups={signups}
              parties={fixedParties}
              partySlots={fixedPartySlots}
              isLoading={isSignupsLoading || isPartiesLoading}
              error={partiesError ?? signupsError}
              onRefresh={refreshAll}
              onNotify={showToast}
            />
          )}
        </motion.div>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
