import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all shadow-xl">
      {/* Шапка карточки */}
      <div className="p-5 flex items-center gap-4 bg-gradient-to-r from-slate-900 to-transparent">
        <img 
          src={player.avatar} 
          alt={player.name} 
          className="w-20 h-20 rounded-xl border-2 border-slate-700 object-cover"
        />
        <div>
          <h3 className="text-2xl font-black text-white">{player.name}</h3>
          <span className="text-xs font-mono text-slate-500">{player.steam_id}</span>
          <div className="mt-1">
             <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full font-bold uppercase">
               {player.role}
             </span>
          </div>
        </div>
      </div>

      {/* Сетка со статистикой */}
      <div className="grid grid-cols-2 gap-4 p-5">
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">MMR</p>
          <p className="text-xl font-mono text-white">{player.mmr}</p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Winrate</p>
          <p className="text-xl font-mono text-green-400">{player.winrate}%</p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">GPM</p>
          <p className="text-xl font-mono text-yellow-500">{player.gpm.toFixed(0)}</p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Matches</p>
          <p className="text-xl font-mono text-blue-400">{player.matches_played}</p>
        </div>
      </div>

      {/* Любимые герои */}
      <div className="px-5 pb-5">
        <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Top Heroes</p>
        <div className="flex gap-2">
          {player.heroes.map((id) => (
            <div key={id} className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400 border border-slate-700">
              {id}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;