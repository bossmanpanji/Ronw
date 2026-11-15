import { useCallback, useEffect, useState } from 'react';
import { RegistrationForm } from './components/RegistrationForm';
import { SignupList } from './components/SignupList';
import { fetchGuildLeagueSignups } from './lib/supabase';
import type { GuildLeagueSignup } from './types/signup';

export default function App() {
  const [signups, setSignups] = useState<GuildLeagueSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadSignups = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await fetchGuildLeagueSignups();
      setSignups(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memuat daftar pendaftar. Silakan coba muat ulang.';
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignups();
  }, [loadSignups]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
        <header className="max-w-2xl mx-auto text-center space-y-1.5">
          <p className="text-sm font-semibold text-[#3730A3]">
            Ragnarok: The New World
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Pendataan Event Guild League OLIGARKI
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Daftarkan nick in game, pilih job, dan tentukan field kamu.
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          <RegistrationForm onSuccess={loadSignups} />
        </div>

        <SignupList
          signups={signups}
          isLoading={isLoading}
          error={listError}
          onRefresh={loadSignups}
        />
      </main>
    </div>
  );
}
