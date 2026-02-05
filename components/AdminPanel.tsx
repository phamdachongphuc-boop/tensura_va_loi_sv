
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Button } from './Button';
import { Mail, Character, GAME_SERVERS } from '../types';
import { LeaderboardModal } from './LeaderboardModal';

interface Props {
  onLogout: () => void;
  onEnterGame: () => void; 
}

export const AdminPanel: React.FC<Props> = ({ onLogout, onEnterGame }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentServerName, setCurrentServerName] = useState(authService.getServerName());
  
  // UI States
  const [showPlayerListModal, setShowPlayerListModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSQLModal, setShowSQLModal] = useState(false); // NEW MODAL
  
  // Delete Confirmation State
  const [deleteConfirmationTarget, setDeleteConfirmationTarget] = useState<string | null>(null);

  // Interaction States for Player List
  const [selectedUserForAction, setSelectedUserForAction] = useState<string | null>(null); 
  const [menuExpanded, setMenuExpanded] = useState(false); 

  // Gift Form State
  const [giftTarget, setGiftTarget] = useState<string | null>(null);
  const [giftType, setGiftType] = useState<'SKILL' | 'ITEM'>('ITEM');
  const [giftName, setGiftName] = useState('');
  const [giftMessage, setGiftMessage] = useState('Phần thưởng từ hệ thống.');

  const refreshUsers = async () => {
    setIsLoading(true);
    const allUsers = await authService.getAllUsers();
    setUsers(allUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    if (showPlayerListModal) {
        refreshUsers();
    }
  }, [showPlayerListModal]);

  const handleSwitchServer = (serverId: string) => {
      authService.setServer(serverId);
      setCurrentServerName(authService.getServerName());
      // Refresh list if modal is open
      if (showPlayerListModal) {
          refreshUsers();
      }
  };

  // --- HANDLERS ---

  const handleUserRowClick = (username: string) => {
    if (selectedUserForAction === username) {
        setSelectedUserForAction(null);
        setMenuExpanded(false);
    } else {
        setSelectedUserForAction(username);
        setMenuExpanded(false); 
    }
  };

  const handleHamburgerClick = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      setMenuExpanded(true);
  };

  const handleBanClick = async (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      if (window.confirm(`CẢNH BÁO: Bạn có chắc muốn KHÓA (BAN) tài khoản [${username}]? Người dùng sẽ không thể đăng nhập.`)) {
          await authService.banUser(username);
          await refreshUsers();
          setSelectedUserForAction(null);
          setMenuExpanded(false);
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      setDeleteConfirmationTarget(username);
  };

  const executeDelete = async () => {
      if (deleteConfirmationTarget) {
          await authService.adminDeleteUser(deleteConfirmationTarget);
          await refreshUsers(); // Refresh immediately to remove from list
          setDeleteConfirmationTarget(null);
          setSelectedUserForAction(null);
          setMenuExpanded(false);
      }
  };

  const handleGiftClick = (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      setGiftTarget(username);
      setGiftName('');
      setGiftMessage('Phần thưởng đặc biệt từ Quản trị viên 1062009.');
      setShowGiftModal(true);
  };

  const handleSendGift = async (e: React.FormEvent) => {
      e.preventDefault();
      if (giftTarget && giftName) {
          if (giftName.includes("∞")) {
              const targetData = await authService.loadGameData(giftTarget);
              if (targetData && targetData.character) {
                  const GOD_HP = 1_000_000_000_000_000;
                  const GOD_STAT = 1_000_000_000;

                  targetData.character.status.hp = GOD_HP;
                  targetData.character.status.maxHp = GOD_HP;
                  targetData.character.status.mp = GOD_HP;
                  targetData.character.status.maxMp = GOD_HP;
                  
                  targetData.character.attributes.strength = GOD_STAT;
                  targetData.character.attributes.magic = GOD_STAT;
                  targetData.character.attributes.agility = GOD_STAT;
                  targetData.character.attributes.defense = GOD_STAT;
                  
                  targetData.character.status.isGodMode = true;
                  targetData.character.status.evolutionStage = "∞ THE CREATOR ∞";

                  await authService.saveGameData(giftTarget, targetData);
                  alert(`Đã kích hoạt chế độ VÔ HẠN (GOD MODE) cho người chơi [${giftTarget}]!`);
              }
          }

          await authService.sendMail(giftTarget, {
              sender: "1062009 (Admin)",
              title: "Quà tặng từ Quản trị viên",
              content: giftMessage,
              type: giftType,
              attachment: giftName
          });
          
          if (!giftName.includes("∞")) {
             alert(`Đã gửi ${giftType} "${giftName}" cho ${giftTarget}`);
          }
          
          setShowGiftModal(false);
          setGiftTarget(null);
      }
  };

  const dummyAdminChar: Character = {
      name: "1062009",
      race: "True Dragon",
      uniqueSkill: "Admin Privilege",
      reincarnationReason: "System Administrator",
      location: "Void",
      attributes: { strength: 9999, magic: 9999, agility: 9999, defense: 9999 },
      status: { 
          hp: 9999, maxHp: 9999, mp: 9999, maxMp: 9999, 
          skills: [], equippedSkills: [], activeEffects: [], inventory: [], 
          quests: [],
          level: 100, evolutionStage: "GOD" 
      }
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-slate-900 text-white font-mono relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}>
        </div>

        <div className="w-full max-w-6xl relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800/90 p-6 rounded border border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] gap-6 backdrop-blur-md">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-red-500 system-font tracking-widest text-glow">ADMINISTRATOR</h1>
                    <p className="text-sm text-red-300 font-mono tracking-[0.3em] mt-1">ACCESS LEVEL: GOD :: ID: 1062009</p>
                    <div className="mt-2 text-xs text-yellow-500 font-bold border border-yellow-800 bg-yellow-900/30 px-2 py-1 inline-block rounded">
                        ACTIVE SERVER: {currentServerName}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button onClick={() => setShowSQLModal(true)} variant="secondary" className="border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-900/20 hover:bg-purple-900/50">
                        🛠 SETUP DATABASE
                    </Button>
                    <Button onClick={onEnterGame} variant="primary" className="border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                        🎮 VÀO GAME
                    </Button>
                    <Button onClick={onLogout} variant="danger">
                        ĐĂNG XUẤT
                    </Button>
                </div>
            </div>

            {/* SERVER SWITCHER */}
            <div className="mb-8 p-4 bg-slate-800/80 border border-cyan-800 rounded flex flex-wrap gap-2 justify-center">
                 <span className="w-full text-center text-xs text-cyan-600 uppercase font-bold tracking-widest mb-1">CHUYỂN ĐỔI SERVER QUẢN LÝ</span>
                 {GAME_SERVERS.map(sv => (
                     <button
                        key={sv.id}
                        onClick={() => handleSwitchServer(sv.id)}
                        disabled={sv.status === 'MAINTENANCE'}
                        className={`px-4 py-2 text-xs font-bold rounded border transition-all ${
                            authService.getServerId() === sv.id 
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                            : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                        }`}
                     >
                         {sv.name}
                     </button>
                 ))}
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                
                <button 
                    onClick={() => setShowPlayerListModal(true)}
                    className="group relative h-40 bg-slate-800 border-2 border-cyan-600 rounded-lg overflow-hidden hover:bg-slate-700 transition-all shadow-[0_0_20px_rgba(8,145,178,0.2)] flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">👥</div>
                    <span className="text-xl font-bold text-cyan-300 system-font tracking-widest group-hover:text-cyan-100">QUẢN LÝ USER</span>
                    <span className="text-[10px] text-cyan-600 uppercase">Manage Users in {currentServerName}</span>
                </button>

                <button 
                    onClick={() => setShowLeaderboard(true)}
                    className="group relative h-40 bg-slate-800 border-2 border-yellow-600 rounded-lg overflow-hidden hover:bg-slate-700 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors"></div>
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">🏆</div>
                    <span className="text-xl font-bold text-yellow-300 system-font tracking-widest group-hover:text-yellow-100">XEM RANK</span>
                    <span className="text-[10px] text-yellow-600 uppercase">View Ranking of {currentServerName}</span>
                </button>

            </div>
        </div>

        {/* --- MODAL: SQL SETUP INSTRUCTIONS --- */}
        {showSQLModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-2xl h-[80vh] flex flex-col border border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                    <div className="bg-purple-950/80 p-4 border-b border-purple-700 flex justify-between items-center shrink-0">
                        <h2 className="text-xl font-bold text-purple-100">HƯỚNG DẪN SETUP DATABASE</h2>
                        <Button onClick={() => setShowSQLModal(false)} variant="ghost" className="text-purple-300 border-purple-800">ĐÓNG</Button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 bg-slate-900/90 text-sm space-y-4">
                        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 text-red-200">
                            <strong>LƯU Ý QUAN TRỌNG:</strong> Không copy tất cả vào cùng một lúc nếu gặp lỗi. Hãy copy từng đoạn mã bên dưới và chạy lần lượt.
                        </div>

                        <div>
                            <label className="block text-cyan-400 font-bold mb-2">BƯỚC 1: TẠO BẢNG (Tensura Battles)</label>
                            <textarea readOnly className="w-full h-32 bg-black border border-slate-700 text-green-400 font-mono p-3 text-xs"
                                value={`create table if not exists tensura_battles (
  id bigint generated by default as identity primary key,
  server_id text not null,
  challenger text not null,
  target text not null,
  status text not null,
  winner text,
  turn text,
  logs jsonb default '[]',
  p1_hp int, p1_max_hp int,
  p2_hp int, p2_max_hp int,
  created_at timestamptz default now()
);`}
                            />
                        </div>

                        <div>
                            <label className="block text-cyan-400 font-bold mb-2">BƯỚC 2: KÍCH HOẠT REALTIME</label>
                            <textarea readOnly className="w-full h-20 bg-black border border-slate-700 text-green-400 font-mono p-3 text-xs"
                                value={`alter publication supabase_realtime add table tensura_battles;`}
                            />
                        </div>
                        
                        <div className="text-center pt-4">
                            <p className="text-slate-400 mb-2">Hoặc copy toàn bộ (nếu hệ thống hỗ trợ):</p>
                            <Button onClick={() => navigator.clipboard.writeText(authService.getDatabaseSetupSQL())} className="bg-purple-800 border-purple-500 text-purple-100">
                                COPY TẤT CẢ VÀO CLIPBOARD
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL: PLAYER LIST --- */}
        {showPlayerListModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-3xl h-[80vh] rounded-lg border border-cyan-500/50 flex flex-col relative overflow-hidden">
                    {/* ... Existing Player List Code ... */}
                    <div className="bg-cyan-950/90 p-4 border-b border-cyan-700 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">👥</span>
                            <div>
                                <h2 className="text-xl font-bold text-cyan-100 system-font tracking-widest">DANH SÁCH ONLINE</h2>
                                <div className="text-[10px] text-yellow-500">{currentServerName}</div>
                            </div>
                        </div>
                        <Button onClick={() => setShowPlayerListModal(false)} variant="ghost" className="text-cyan-500 border-cyan-800">
                            [ ĐÓNG ]
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-900/50 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin h-8 w-8 border-4 border-cyan-500 rounded-full border-t-transparent"></div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10">Không có dữ liệu trên server này.</div>
                        ) : (
                            users.map((user) => {
                                const isSelected = selectedUserForAction === user.username;
                                const char = user.saveData?.character;
                                const isBanned = user.isBanned;

                                return (
                                    <div 
                                        key={user.username}
                                        onClick={() => handleUserRowClick(user.username)}
                                        className={`relative flex items-center justify-between p-4 rounded border transition-all duration-300 cursor-pointer overflow-visible
                                            ${isSelected 
                                                ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                                                : 'bg-slate-800/40 border-slate-700 hover:border-cyan-600'
                                            }
                                            ${isBanned ? 'opacity-50 grayscale' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border shrink-0 ${isSelected ? 'border-cyan-300 bg-cyan-800' : 'border-slate-600 bg-slate-800'}`}>
                                                {char ? char.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`font-bold truncate ${isSelected ? 'text-cyan-100' : 'text-slate-200'}`}>
                                                    {user.username}
                                                    {isBanned && <span className="ml-2 text-[10px] bg-red-600 text-white px-1 rounded">BANNED</span>}
                                                </div>
                                                <div className="text-xs text-slate-400 truncate">
                                                    {char ? `${char.name} (${char.race})` : 'Chưa tạo nhân vật'}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && !isBanned && (
                                            <div className="flex items-center animate-scale-in shrink-0 ml-2 relative z-10">
                                                {!menuExpanded ? (
                                                    <button onClick={handleHamburgerClick} className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-900/50 rounded-full transition-colors group border border-transparent hover:border-cyan-500/50">
                                                        <div className="w-5 h-0.5 bg-cyan-400 group-hover:bg-white transition-colors shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                                        <div className="w-5 h-0.5 bg-cyan-400 group-hover:bg-white transition-colors shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                                        <div className="w-5 h-0.5 bg-cyan-400 group-hover:bg-white transition-colors shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-3 animate-slide-in-right">
                                                        <button onClick={(e) => handleGiftClick(e, user.username)} className="w-10 h-10 flex items-center justify-center bg-yellow-900/30 border border-yellow-500 rounded-full text-2xl hover:bg-yellow-800/50 hover:scale-110 transition-all shadow-[0_0_10px_rgba(234,179,8,0.4)]" title="Tặng Quà">🎁</button>
                                                        <button onClick={(e) => handleBanClick(e, user.username)} className="w-10 h-10 flex items-center justify-center bg-slate-700/50 border border-slate-500 rounded-full text-xl hover:bg-slate-600 hover:text-white hover:scale-110 transition-all shadow-[0_0_10px_rgba(100,116,139,0.4)]" title="Khóa Tài Khoản (Ban)">🚫</button>
                                                        <button onClick={(e) => handleDeleteClick(e, user.username)} className="w-10 h-10 flex items-center justify-center bg-red-900/50 border border-red-500 rounded-full text-xl font-bold text-red-500 hover:bg-red-800 hover:text-white hover:scale-110 transition-all shadow-[0_0_10px_rgba(220,38,38,0.6)]" title="Xóa Vĩnh Viễn">❌</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isBanned && (
                                            <div className="flex gap-2">
                                                 <Button variant="secondary" className="text-[10px] px-2 py-1 ml-2" onClick={async (e) => { e.stopPropagation(); await authService.unbanUser(user.username); refreshUsers(); }}>GỠ BAN</Button>
                                                 <button onClick={(e) => handleDeleteClick(e, user.username)} className="w-8 h-8 flex items-center justify-center bg-red-900/50 border border-red-500 rounded-full text-sm font-bold text-red-500 hover:bg-red-800 hover:text-white ml-2">❌</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* ... Existing Delete & Gift Modals ... */}
        {deleteConfirmationTarget && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-md p-6 border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#ef4444_0,#ef4444_10px,transparent_10px,transparent_20px)] pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><span className="text-2xl text-red-500">⚠</span></div>
                        <h3 className="text-xl font-bold text-red-500 mb-6 tracking-widest system-font text-glow">XÁC NHẬN XÓA</h3>
                        <p className="text-cyan-100 mb-8 font-mono leading-relaxed px-2">bạn có chắc chắn xóa tài khoản game của người này ra khỏi hệ game online và bản xếp hạng không?</p>
                        <div className="flex gap-4 justify-center">
                            <Button onClick={() => setDeleteConfirmationTarget(null)} variant="secondary" className="w-24 border-slate-600">không</Button>
                            <Button onClick={executeDelete} variant="danger" className="w-24 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">có</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showGiftModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in">
                <div className="raphael-panel w-full max-w-md p-6 rounded border border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 border-b border-yellow-800 pb-2 flex items-center gap-2"><span>🎁</span>TẶNG QUÀ: <span className="text-white">{giftTarget}</span></h3>
                    <form onSubmit={handleSendGift} className="space-y-4">
                        <div>
                            <label className="block text-xs text-yellow-600 font-bold mb-1">LOẠI QUÀ</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-2 rounded border border-slate-600 hover:border-yellow-500"><input type="radio" checked={giftType === 'ITEM'} onChange={() => setGiftType('ITEM')} /><span className={giftType === 'ITEM' ? 'text-yellow-200' : 'text-slate-400'}>Vật phẩm</span></label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-2 rounded border border-slate-600 hover:border-yellow-500"><input type="radio" checked={giftType === 'SKILL'} onChange={() => setGiftType('SKILL')} /><span className={giftType === 'SKILL' ? 'text-yellow-200' : 'text-slate-400'}>Kỹ năng</span></label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-yellow-600 font-bold mb-1">TÊN</label>
                            <input type="text" value={giftName} onChange={e => setGiftName(e.target.value)} className="w-full bg-slate-900 border border-yellow-800 p-2 text-white focus:border-yellow-400 outline-none rounded" placeholder={giftType === 'ITEM' ? "Ví dụ: Kiếm Thần, [ ∞ ]..." : "Ví dụ: Kỹ năng Bay, Hỏa Cầu..."} required />
                            <div className="text-[9px] text-slate-500 mt-1 italic">*Mẹo Admin: Gửi quà có tên chứa "∞" để kích hoạt God Mode.</div>
                        </div>
                        <div>
                            <label className="block text-xs text-yellow-600 font-bold mb-1">LỜI NHẮN</label>
                            <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} className="w-full bg-slate-900 border border-yellow-800 p-2 text-white focus:border-yellow-400 outline-none h-24 rounded resize-none" required />
                        </div>
                        <div className="flex gap-3 justify-end mt-4">
                            <Button type="button" onClick={() => setShowGiftModal(false)} variant="ghost" className="hover:bg-slate-800">HỦY</Button>
                            <Button type="submit" variant="primary" className="border-yellow-500 bg-yellow-900/50 hover:bg-yellow-800 text-yellow-100">GỬI NGAY</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showLeaderboard && (
            <LeaderboardModal currentUserCharacter={dummyAdminChar} onClose={() => setShowLeaderboard(false)} />
        )}
    </div>
  );
};
