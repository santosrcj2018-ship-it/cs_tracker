
import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// Initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface Player {
  nickname: string;
  elo: string;
  avatar: string;
  country: string;
}

interface Match {
  date: string;
  time: string;
  opponent: string;
  opponentAvatar: string;
}

interface TeamData {
  name: string;
  avatar: string;
  players: Player[];
  league: string;
  region: string;
  matches: Match[];
}

const App = () => {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>("");

  const parseHtmlData = (htmlString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Extract Team Header
    const teamName = doc.querySelector('.styles__TeamName-sc-5671d23c-5')?.textContent || "Unknown Team";
    const teamAvatar = (doc.querySelector('.Avatar__Image-sc-75870453-2') as HTMLImageElement)?.src || "";

    // Extract Players
    // Fix: Removed 'playerElements' as it was incorrectly calling .closest() on an array and was not being used.
    const playerNicknames = Array.from(doc.querySelectorAll('.styles__Nickname-sc-3441c003-2')).map(el => el.textContent || "");
    const playerElos = Array.from(doc.querySelectorAll('.styles__EloText-sc-c081ed6b-1')).map(el => el.textContent || "");
    const playerAvatars = Array.from(doc.querySelectorAll('.styles__Avatar-sc-5688573a-1 img')).map(el => (el as HTMLImageElement).src || "");

    const players: Player[] = playerNicknames.slice(0, 5).map((nick, i) => ({
      nickname: nick,
      elo: playerElos[i] || "0",
      avatar: playerAvatars[i] || "",
      country: "PT" // Hardcoded based on provided HTML flags
    }));

    // League Info
    const leagueGroup = doc.querySelector('[data-testid="description"]')?.textContent || "Intermediate";
    const region = "Europe"; // Based on provided info

    // Matches
    const matchItems = Array.from(doc.querySelectorAll('.styles__MatchesHolder-sc-b611c7e4-1 a'));
    const matches: Match[] = matchItems.map(item => {
      const date = item.querySelector('.styles__Holder-sc-464d563d-0 span:first-child')?.textContent || "";
      const time = item.querySelector('.styles__Holder-sc-464d563d-0 span:last-child')?.textContent || "";
      const opponent = item.querySelector('.styles__TeamMetaContainer-sc-331aa0c3-0 span')?.textContent || "Unknown";
      const opponentAvatar = (item.querySelector('.Avatar__AvatarHolder-sc-75870453-1 img') as HTMLImageElement)?.src || "";
      return { date, time, opponent, opponentAvatar };
    });

    return {
      name: teamName,
      avatar: teamAvatar,
      players,
      league: leagueGroup,
      region,
      matches
    };
  };

  const getAiScoutingReport = async (team: TeamData) => {
    try {
      const prompt = `Analyze this CS2 Team: ${team.name}. 
      League: ${team.league} in ${team.region}. 
      Players: ${team.players.map(p => `${p.nickname} (Elo: ${p.elo})`).join(', ')}.
      Scheduled matches against: ${team.matches.map(m => m.opponent).join(', ')}.
      Give a professional esports scouting report summary in Portuguese. 
      Format it as short bullet points. Be motivating.`;

      // Correct call to ai.models.generateContent using gemini-3-flash-preview for text analysis
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Correct access to the text property of the response
      setAiReport(result.text || "Análise indisponível.");
    } catch (e) {
      console.error(e);
      setAiReport("Ocorreu um erro na análise da IA.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parsed = parseHtmlData(content);
      setData(parsed);
      await getAiScoutingReport(parsed);
      setLoading(false);
    };
    reader.readAsText(file);
  };

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 faceit-bg rounded-2xl flex items-center justify-center mb-4 mx-auto glow-orange">
            <i className="fas fa-chart-line text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">FACEIT <span className="faceit-orange">DASHBOARD</span></h1>
          <p className="text-slate-400 max-w-md mx-auto">Carregue o arquivo HTML exportado do programa para gerar um relatório profissional da sua equipa.</p>
        </div>

        <div className="w-full max-w-xl">
          <label className="drop-zone w-full p-12 rounded-3xl cursor-pointer flex flex-col items-center glass">
            <i className="fas fa-file-upload text-3xl mb-4 text-slate-500"></i>
            <span className="text-lg font-semibold">Solte o arquivo ou clique para carregar</span>
            <span className="text-sm text-slate-500 mt-2">Suporta arquivos .html gerados pelo seu programa</span>
            <input type="file" className="hidden" accept=".html" onChange={handleFileUpload} />
          </label>
        </div>
        
        {loading && (
          <div className="mt-8 flex items-center gap-3 text-faceit-orange animate-pulse">
            <i className="fas fa-circle-notch fa-spin"></i>
            <span>Processando dados e gerando análise de IA...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-6">
          <img src={data.avatar} alt="Team" className="w-24 h-24 rounded-2xl glow-orange border-2 border-orange-500/20" />
          <div>
            <h1 className="text-3xl font-extrabold text-white">{data.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">CS2 Open</span>
              <span className="flex items-center gap-2 text-slate-400 text-sm">
                <i className="fas fa-globe-europe"></i> {data.region} • {data.league}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setData(null)}
          className="px-6 py-2 glass rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
        >
          <i className="fas fa-sync-alt mr-2"></i> Novo Relatório
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Players & Roster */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <i className="fas fa-users faceit-orange"></i> Roster Ativo
              </h2>
              <span className="text-slate-500 text-xs uppercase font-bold">{data.players.length} Membros</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.players.map((player, idx) => (
                <div key={idx} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-orange-500/40 transition-all group">
                  <div className="relative">
                    <img src={player.avatar} alt={player.nickname} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] px-1 rounded-sm font-bold">LVL 10</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-faceit-orange transition-colors">{player.nickname}</span>
                      <img src="https://flagcdn.com/pt.svg" className="w-4 h-2.5" alt="PT" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <i className="fas fa-star text-orange-400"></i>
                      <span>Elo Rating: <span className="text-white font-semibold">{player.elo}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="bg-gradient-to-br from-orange-600/10 to-slate-900/50 border border-orange-500/20 rounded-3xl p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <i className="fas fa-robot faceit-orange"></i> AI Scouting Report
            </h2>
            <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
              {aiReport ? (
                <div className="whitespace-pre-line bg-black/20 p-4 rounded-xl border border-white/5">
                  {aiReport}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <i className="fas fa-circle-notch fa-spin"></i> Gerando análise...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: League & Matches */}
        <div className="lg:col-span-4 space-y-8">
          {/* Stats Summary */}
          <div className="glass rounded-3xl p-6">
             <h2 className="text-xl font-bold mb-6">Temporada 56</h2>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-4 rounded-2xl text-center">
                 <div className="text-green-500 text-2xl font-black">0W</div>
                 <div className="text-slate-500 text-[10px] uppercase font-bold mt-1">Vitórias</div>
               </div>
               <div className="bg-slate-900/50 p-4 rounded-2xl text-center">
                 <div className="text-red-500 text-2xl font-black">0L</div>
                 <div className="text-slate-500 text-[10px] uppercase font-bold mt-1">Derrotas</div>
               </div>
             </div>
             <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
               <span className="text-slate-400 text-xs">Posição Atual</span>
               <div className="text-lg font-bold">5th - 305th</div>
             </div>
          </div>

          {/* Upcoming Matches */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <i className="far fa-calendar-alt faceit-orange"></i> Próximos Jogos
            </h2>
            <div className="space-y-4">
              {data.matches.map((match, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">{match.date}</span>
                    <span className="text-[10px] text-faceit-orange font-bold uppercase">{match.time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={match.opponentAvatar} alt={match.opponent} className="w-10 h-10 rounded-lg" />
                    <span className="font-bold text-sm">{match.opponent}</span>
                  </div>
                </div>
              ))}
              {data.matches.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic text-sm">
                  Nenhuma partida agendada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
