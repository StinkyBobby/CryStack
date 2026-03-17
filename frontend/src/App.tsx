import PlayerCard from './components/PlayerCard';
import { Player } from './types';

function App() {
  // Это наши тестовые данные (имитация того, что придет из Go)
  const testPlayer: Player = {
    steam_id: "76561198000000000",
    name: "Crystacks Developer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky", // Генератор аватарок
    role: "Support / Captain",
    style: "Tactical",
    heroes: [102, 5, 87], // Chen, CM, Disruptor
    winrate: 62.3,
    last_updated: new Date().toISOString(),
    mmr: 5200,
    gpm: 410.2,
    xpm: 550.8,
    matches_played: 245
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 font-sans">
      {/* Навигация (Header) */}
      <nav className="border-b border-slate-800 bg-[#0f1219] p-4 mb-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter text-red-500">
            CRYSTACKS <span className="text-[10px] bg-red-500 text-white px-1 ml-1 rounded">BETA</span>
          </h1>
          <div className="flex gap-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition">Dashboard</a>
            <a href="#" className="hover:text-white transition">Teams</a>
            <a href="#" className="hover:text-white transition">Players</a>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="max-w-6xl mx-auto px-4">
        <header className="mb-12">
          <h2 className="text-4xl font-bold mb-2">Обзор профиля</h2>
          <p className="text-slate-500">Тестовый просмотр данных из локального состояния</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Наша карточка (занимает 1 колонку) */}
          <div className="md:col-span-1">
            <PlayerCard player={testPlayer} />
          </div>

          {/* Заглушка для статистики (занимает 2 колонки) */}
          <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center border-dashed">
            <div className="text-slate-600 text-center">
              <p className="text-lg font-medium">Графики активности появятся здесь</p>
              <p className="text-sm">Скоро мы подключим TanStack Query для связи с бэкендом</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;