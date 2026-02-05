
import React, { useEffect, useState, useRef } from 'react';
import { Character, CharacterStatus, Mail } from '../types';
import { Button } from './Button';
import { authService } from '../services/authService';
import { PlayerDetailModal } from './PlayerDetailModal';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string; 
  username: string; 
  avatar: string; 
  customAvatar?: string; 
  daysSurvived: number;
  ultimateSkillCount: number;
  powerLevel: number; 
  race: string;
  isCurrentUser?: boolean;
  isOnline: boolean;
  detailStatus?: CharacterStatus; 
  isGodMode?: boolean; // New field for UI
}

interface Props {
  currentUserCharacter: Character;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<Props> = ({ currentUserCharacter, onClose }) => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [serverName, setServerName] = useState("");

  const [selectedUserForMenu, setSelectedUserForMenu] = useState<string | null>(null);
  const [showActionButtons, setShowActionButtons] = useState(false); 
  
  // Viewing Player State
  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardEntry | null>(null);
  const [deleteConfirmationTarget, setDeleteConfirmationTarget] = useState<string | null>(null);

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftTargetUser, setGiftTargetUser] = useState<string | null>(null);
  const [giftType, setGiftType] = useState<'SKILL' | 'ITEM'>('ITEM');
  const [giftName, setGiftName] = useState('');
  const [giftMessage, setGiftMessage] = useState('Phần thưởng từ hệ thống.');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
        const sessionUser = await authService.getCurrentUser();
        if (sessionUser) {
            if (sessionUser.isAdmin) setIsAdmin(true);
            if (sessionUser.username === "1062009") {
                setIsAdmin(true);
                setIsSuperAdmin(true);
            }
        }
        setServerName(authService.getServerName());
        await refreshLeaderboard();
    };
    init();

    const unsubscribe = authService.subscribeToChanges(() => {
        refreshLeaderboard(true);
    });

    return () => {
        unsubscribe();
    };
  }, [currentUserCharacter]);

  const refreshLeaderboard = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    const allUsers = await authService.getAllUsers();
    const currentSessionUser = await authService.getCurrentUser();

    const entries: LeaderboardEntry[] = allUsers.map((user) => {
        if (user.isBanned) return null;
        if (user.username === "1062009") return null;

        const saveData = user.saveData;
        let charName = "Unknown Entity";
        let days = 0;
        let power = 0;
        let skillCount = 0;
        let race = "Spirit";
        let avatar = "👻";
        let customAvatar = undefined;
        let detailStatus: CharacterStatus | undefined = undefined;
        let isGodMode = false;

        if (saveData && saveData.character) {
            const char = saveData.character;
            const history = saveData.chatHistory || [];
            
            charName = char.name;
            race = char.race;
            skillCount = char.status.skills.length;
            detailStatus = char.status;
            isGodMode = !!char.status.isGodMode;
            customAvatar = char.customAvatar;
            days = Math.max(1, Math.floor(history.length / 10));

            // Power Calculation
            if (isGodMode) {
                power = Infinity;
            } else {
                power = (char.status.hp + char.status.maxMp) * 10 + (skillCount * 1000);
                // Hard Cap for mortals: 1 Quadrillion (1 Million Billion)
                const LIMIT = 1_000_000_000_000_000;
                if (power > LIMIT) power = LIMIT;
            }

            if (race.includes("Slime")) avatar = "💧";
            else if (race.includes("Human")) avatar = "🧑";
            else if (race.includes("Kijin") || race.includes("Ogre")) avatar = "👹";
            else if (race.includes("Demon") || race.includes("Ác Ma")) avatar = "👿";
            else if (race.includes("Dragon") || race.includes("Long")) avatar = "🐲";
            else if (race.includes("Dwarf") || race.includes("Lùn")) avatar = "🧔";
            else if (race.includes("Elf")) avatar = "🧝‍♀️";
            else avatar = "👤";
        }

        const isMe = currentSessionUser ? user.username === currentSessionUser.username : false;
        const now = Date.now();
        const lastActive = user.lastActive || 0;
        const isOnline = (now - lastActive) < 2 * 60 * 1000;

        return {
            id: user.username,
            rank: 0,
            name: charName,
            username: user.username,
            avatar: avatar,
            customAvatar: customAvatar,
            daysSurvived: days,
            ultimateSkillCount: skillCount,
            powerLevel: power,
            race: race,
            isCurrentUser: isMe,
            isOnline: isOnline || isMe,
            detailStatus: detailStatus,
            isGodMode: isGodMode
        };
    }).filter(e => e !== null) as LeaderboardEntry[];

    entries.sort((a, b) => b.powerLevel - a.powerLevel);

    const top100Entries = entries.slice(0, 100);
    const rankedEntries = top100Entries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    setData(rankedEntries);
    if (!silent) setIsLoading(false);
  };

  const handleAvatarClick = (entry: LeaderboardEntry) => {
      if (entry.isCurrentUser) {
          fileInputRef.current?.click();
      } else {
          handleViewProfile(entry);
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          alert('Vui lòng chọn file hình ảnh (JPG, PNG).');
          return;
      }
      setIsUploading(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async (e) => {
              const base64 = e.target?.result as string;
               const sessionUser = await authService.getCurrentUser();
               if (sessionUser) {
                  await authService.updateUserAvatar(sessionUser.username, base64);
                  await refreshLeaderboard();
               }
               setIsUploading(false);
          }
      } catch (error) {
          setIsUploading(false);
      }
  };

  const handleUserClick = (entry: LeaderboardEntry) => {
      if (entry.isCurrentUser) return;
      // Toggle menu for this user
      if (selectedUserForMenu === entry.username) {
          setSelectedUserForMenu(null);
          setShowActionButtons(false);
      } else {
          setSelectedUserForMenu(entry.username);
          setShowActionButtons(true); 
      }
  };

  const handleViewProfile = (entry: LeaderboardEntry) => {
      if (entry.detailStatus) {
          setViewingPlayer(entry);
          setSelectedUserForMenu(null);
          setShowActionButtons(false);
      }
  };

  const handleChallenge = async (entry: LeaderboardEntry) => {
      if (!entry.detailStatus) return;
      
      const me = await authService.getCurrentUser();
      if (!me) return;
      
      const myData = await authService.loadGameData(me.username);
      if (!myData || !myData.character) return;
      
      // Calculate max HP for logic
      const p1_max = myData.character.status.maxHp;
      const p2_max = entry.detailStatus.maxHp;

      const result = await authService.createBattle(me.username, entry.username, p1_max, p1_max, p2_max, p2_max);
      
      if (result === true) {
          alert(`Đã gửi lời khiêu chiến tới [${entry.username}]!`);
          onClose(); // Close leaderboard to wait for response
      } else if (result === 'MISSING_TABLE') {
          alert("LỖI HỆ THỐNG: Chưa cấu hình Database cho PvP.\nHãy liên hệ Admin (1062009) để chạy lệnh Setup Database trong Admin Panel.");
      } else {
          alert("Lỗi tạo trận đấu. Hãy kiểm tra kết nối.");
      }
  };

  const handleHamburgerClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowActionButtons(true);
  };

  const handleOpenGift = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedUserForMenu) {
          setGiftTargetUser(selectedUserForMenu);
          setShowGiftModal(true);
      }
  };

  const submitGift = async (e: React.FormEvent) => {
      e.preventDefault();
      if (giftTargetUser && giftName) {
           await authService.sendMail(giftTargetUser, {
              sender: "1062009 (Admin)",
              title: "Quà tặng từ Quản trị viên",
              content: giftMessage,
              type: giftType,
              attachment: giftName
          });
          alert(`Đã gửi quà!`);
          setShowGiftModal(false);
      }
  };
  
  const handleBanUser = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedUserForMenu && window.confirm("Khóa tài khoản này?")) {
          await authService.banUser(selectedUserForMenu);
          refreshLeaderboard();
      }
  };

  const handleDeleteUser = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(selectedUserForMenu) setDeleteConfirmationTarget(selectedUserForMenu);
  };
  
  const executeDelete = async () => {
      if(deleteConfirmationTarget) {
          await authService.adminDeleteUser(deleteConfirmationTarget);
          setDeleteConfirmationTarget(null);
          refreshLeaderboard();
      }
  };
  
  const handleDevourUser = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if(selectedUserForMenu) {
          await authService.adminDevourUser(selectedUserForMenu);
          alert("Devoured!");
          refreshLeaderboard();
      }
  };

  const getRankStyle = (rank: number, isGodMode?: boolean) => {
    if (isGodMode) return "border-purple-500 bg-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
    switch (rank) {
      case 1: return "border-yellow-400/50 bg-yellow-900/20";
      case 2: return "border-slate-300/50 bg-slate-800/30";
      case 3: return "border-orange-400/50 bg-orange-900/20";
      default: return "border-cyan-900/30 bg-slate-900/40";
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-scale-in">
      <div className="raphael-panel w-full max-w-2xl h-[85vh] rounded-lg border border-cyan-500/50 shadow relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-cyan-950/80 p-4 border-b border-cyan-500/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-xl">🏆</span>
             <h2 className="text-xl font-bold text-cyan-100 system-font tracking-widest">TOP 100 CAO THỦ</h2>
          </div>
          <Button onClick={onClose} variant="ghost" className="text-cyan-400">[ X ]</Button>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 relative z-10">
            {isLoading ? <div className="text-center text-cyan-400">Đang tải...</div> : 
             data.map((entry, idx) => (
                <div 
                    key={entry.id}
                    onClick={() => handleUserClick(entry)}
                    className={`relative grid grid-cols-12 gap-2 items-center p-3 rounded border transition-all cursor-pointer ${getRankStyle(entry.rank, entry.isGodMode)} ${entry.isCurrentUser ? 'border-cyan-400' : ''}`}
                >
                    <div className="col-span-2 text-center text-xl font-bold">
                        {entry.isGodMode ? <span className="text-purple-300 animate-pulse text-2xl">∞</span> : entry.rank}
                    </div>
                    <div className="col-span-5 flex items-center gap-3 relative">
                        <div onClick={(e) => { e.stopPropagation(); handleAvatarClick(entry); }} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 overflow-hidden relative shrink-0">
                             {entry.customAvatar ? <img src={entry.customAvatar} className="w-full h-full object-cover"/> : entry.avatar}
                             {entry.isOnline && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-black animate-pulse"></div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate text-sm text-cyan-100 flex items-center gap-1">
                                {entry.username}
                                {entry.isGodMode && <span className="text-[8px] bg-purple-600 text-white px-1 rounded shadow-sm border border-purple-400">GOD</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">{entry.name}</span>
                        </div>
                    </div>
                    <div className="col-span-3 text-right text-xs font-mono text-cyan-200">
                        {entry.isGodMode || entry.powerLevel === Infinity ? (
                            <span className="text-xl font-bold text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]">∞</span>
                        ) : (
                            entry.powerLevel.toLocaleString()
                        )}
                    </div>
                    <div className="col-span-2 text-right font-bold text-xs">{entry.daysSurvived}d</div>

                    {/* MENU POPUP - FIXED MOBILE POSITIONING */}
                    {selectedUserForMenu === entry.username && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50 flex items-center bg-slate-900 border border-cyan-500 rounded px-2 py-1 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-scale-in">
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleViewProfile(entry); }} className="w-8 h-8 flex items-center justify-center bg-blue-900/50 border border-blue-600 rounded text-blue-400 hover:bg-blue-800" title="Xem">🔍</button>
                                
                                {/* CHALLENGE BUTTON (For Everyone) */}
                                <button onClick={(e) => { e.stopPropagation(); handleChallenge(entry); }} className="w-8 h-8 flex items-center justify-center bg-red-900/50 border border-red-600 rounded text-red-400 hover:bg-red-800 font-bold animate-pulse" title="KHIÊU CHIẾN (PVP)">
                                    ⚔
                                </button>

                                {/* Admin Only Buttons */}
                                {isAdmin && (
                                    <>
                                        <button onClick={handleOpenGift} className="w-8 h-8 flex items-center justify-center bg-yellow-900/50 border border-yellow-600 rounded">🎁</button>
                                        <button onClick={handleBanUser} className="w-8 h-8 flex items-center justify-center bg-slate-700 border border-slate-500 rounded">🚫</button>
                                        <button onClick={handleDeleteUser} className="w-8 h-8 flex items-center justify-center bg-red-900 border border-red-600 rounded">❌</button>
                                        {isSuperAdmin && <button onClick={handleDevourUser} className="w-8 h-8 flex items-center justify-center bg-purple-900 border border-purple-600 rounded">👹</button>}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
             ))
            }
        </div>
        
        {/* Detail Modal */}
        {viewingPlayer && viewingPlayer.detailStatus && (
            <PlayerDetailModal
                username={viewingPlayer.username}
                avatar={viewingPlayer.avatar}
                customAvatar={viewingPlayer.customAvatar}
                race={viewingPlayer.race}
                status={viewingPlayer.detailStatus}
                onClose={() => setViewingPlayer(null)}
            />
        )}

        {/* Gift Modal - CHANGED TO FIXED POSITIONING */}
        {showGiftModal && (
            <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-scale-in">
                 <div className="bg-slate-900 p-6 border-2 border-yellow-500 rounded w-full max-w-sm shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                     <h3 className="text-yellow-500 font-bold mb-4 uppercase text-center border-b border-yellow-800 pb-2">
                        Gửi quà cho {giftTargetUser}
                     </h3>
                     <form onSubmit={submitGift} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-yellow-600 mb-1">LOẠI</label>
                            <div className="flex gap-2">
                                <Button type="button" onClick={()=>setGiftType('ITEM')} className={`flex-1 text-xs ${giftType==='ITEM' ? 'bg-yellow-700' : 'bg-slate-800'}`}>Vật phẩm</Button>
                                <Button type="button" onClick={()=>setGiftType('SKILL')} className={`flex-1 text-xs ${giftType==='SKILL' ? 'bg-yellow-700' : 'bg-slate-800'}`}>Kỹ năng</Button>
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-yellow-600 mb-1">TÊN QUÀ</label>
                            <input value={giftName} onChange={e=>setGiftName(e.target.value)} placeholder="Nhập tên..." className="w-full bg-slate-800 p-2 text-white border border-slate-600 focus:border-yellow-500 outline-none rounded" required />
                         </div>
                         <div className="flex gap-2 justify-end mt-6">
                             <Button type="button" onClick={()=>setShowGiftModal(false)} variant="ghost" className="hover:bg-slate-800">HỦY</Button>
                             <Button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold">GỬI NGAY</Button>
                         </div>
                     </form>
                 </div>
            </div>
        )}
        
        {/* Delete Modal - CHANGED TO FIXED POSITIONING */}
        {deleteConfirmationTarget && (
            <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-scale-in">
                <div className="bg-red-900/20 border-2 border-red-600 p-6 rounded text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] w-full max-w-sm backdrop-blur-md">
                    <h3 className="text-red-500 font-bold text-xl mb-4 system-font tracking-widest text-glow">XÓA TÀI KHOẢN?</h3>
                    <p className="text-white mb-6 font-mono text-sm">
                        Bạn có chắc chắn muốn xóa vĩnh viễn <span className="font-bold text-red-400">{deleteConfirmationTarget}</span>?
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button onClick={()=>setDeleteConfirmationTarget(null)} variant="secondary">KHÔNG</Button>
                        <Button onClick={executeDelete} variant="danger" className="animate-pulse">XÓA NGAY</Button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
