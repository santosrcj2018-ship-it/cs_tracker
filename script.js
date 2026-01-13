import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'teamhub_pro_data';

const App = () => {
  const [teams, setTeams] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef(null);

  // Carregar dados do localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setTeams(JSON.parse(savedData));
      } catch {
        console.error("Erro ao carregar dados salvos");
      }
    }
  }, []);

  // Guardar dados
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  }, [teams]);

  const parseTeamFile = (htmlString, fileName) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const teamName =
      doc.querySelector('h4[class*="TeamName"], .styles__TeamName-sc-5671d23c-5')
        ?.textContent || fileName.replace('.html', '');

    const teamAvatar =
      doc.querySelector('img[class*="Avatar"], .Avatar__Image-sc-75870453-2')
        ?.src || "";

    const nicknames = Array.from(doc.querySelectorAll('[class*="Nickname"]'))
      .map(n => n.textContent || "");

    const elos = Array.from(doc.querySelectorAll('[class*="EloText"]'))
      .map(e => e.textContent || "0");

    const avatars = Array.from(doc.querySelectorAll('[class*="Avatar"] img'))
      .map(img => img.src);

    const players = nicknames
      .slice(0, 10)
      .filter(n => n.length > 1)
      .map((nick, i) => ({
        nickname: nick,
        elo: elos[i] || "N/A",
        avatar: avatars[i] || "https://www.faceit.com/static/img/avatar/avatar_default_user.png",
        lvl: "10"
      }));

    const league =
      doc.querySelector('[data-testid="description"], [class*="TitleDescription"]')
        ?.textContent || "Intermediate";

    const wins = doc.querySelector('[class*="Wins"]')?.textContent || "0 W";
    const losses = doc.querySelector('[class*="Losses"]')?.textContent || "0 L";
    const position =
      doc.querySelector('[class*="ResultsInfoRow"] h6')?.textContent || "N/A";

    const matches = Array.from(doc.querySelectorAll('[class*="MatchesHolder"] a'))
      .map(el => {
        const dateTime = el.querySelector('[class*="Holder-sc-464d563d"]');
        return {
          date: dateTime?.querySelector('span:first-child')?.textContent || "",
          time: dateTime?.querySelector('span:last-child')?.textContent || "",
          opponent:
            el.querySelector('[class*="TeamMetaContainer"] span, [class*="TeamName"]')
              ?.textContent || "TBD",
          opponentAvatar: el.querySelector('img')?.src || ""
        };
      });

    return {
      id: Math.random().toString(36).slice(2, 9),
      name: teamName,
      avatar: teamAvatar,
      players,
      league,
      region: "Europe",
      matches,
      stats: { wins, losses, position }
    };
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    let loaded = 0;
    const newTeams = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        newTeams.push(parseTeamFile(ev.target.result, file.name));
        loaded++;
        if (loaded === files.length) {
          setTeams(prev => [...prev, ...newTeams]);
          setIsAdmin(false);
        }
      };
      reader.readAsText(file);
    });
  };

  const removeTeam = (id) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    if (selectedIndex >= teams.length - 1) setSelectedIndex(0);
  };

  const generateAIReport = async (team) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return;

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
Analisa a equipa de CS2 "${team.name}" na liga "${team.league}".
Jogadores: ${team.players.map(p => p.nickname).join(', ')}.
Registo: ${team.stats.wins}-${team.stats.losses}.
Faz um scouting report curto e motivador em Português de Portugal.
        `
      });

      setTeams(prev =>
        prev.map(t =>
          t.id === team.id ? { ...t, aiReport: response.text } : t
        )
      );
    } catch (err) {
      console.error("Erro na IA:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTeam = teams[selectedIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-12 font-sans">
      {/* UI igual ao original */}
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
