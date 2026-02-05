import React, { useState } from 'react';
import { Character } from '../types';
import { Button } from './Button';

interface Props {
  onComplete: (char: Character) => void;
  onCancel: () => void;
}

// Updated Races with Skills Data
const RACES = [
  { 
      id: "Slime", 
      label: "Slime (Chất nhờn)", 
      desc: "Kháng vật lý, Thích ứng cao",
      uniqueSkill: "Kẻ Săn Mồi (Predator)",
      baseSkills: ["Hấp Thụ", "Hòa Tan", "Tự Tái Tạo", "Kháng Vật Lý", "Cảm Thụ Nhiệt Độ"]
  },
  { 
      id: "Human", 
      label: "Human (Dị giới nhân)", 
      desc: "Cân bằng, Tiềm năng ma thuật",
      uniqueSkill: "Kẻ Được Chọn (Chosen One)",
      baseSkills: ["Thông Thạo Ngôn Ngữ", "Võ Thuật", "Ma Pháp Nguyên Tố", "Nấu Ăn"]
  },
  { 
      id: "Kijin", 
      label: "Kijin (Quỷ Nhân)", 
      desc: "Sức mạnh thể chất, Chiến binh",
      uniqueSkill: "Chiến Thần (War God)",
      baseSkills: ["Cường Hóa Cơ Thể", "Hỏa Diệm Thuật", "Kiếm Thuật", "Hào Quang Uy Hiếp"]
  },
  { 
      id: "Demon", 
      label: "Demon (Ác Ma)", 
      desc: "Ma lực khổng lồ, Tinh thần lực",
      uniqueSkill: "Cám Dỗ (Tempter)",
      baseSkills: ["Ma Pháp Đen", "Kháng Phép", "Dịch Chuyển Tức Thời", "Thao Túng Vật Chất"]
  },
  { 
      id: "Dragonnewt", 
      label: "Dragonnewt (Long Nhân)", 
      desc: "Phòng thủ cao, Huyết long",
      uniqueSkill: "Long Hóa (Dragon Mode)",
      baseSkills: ["Vảy Rồng", "Hơi Thở Rồng", "Bay Lượn", "Kháng Nhiệt Độ"]
  },
  { 
      id: "Dwarf", 
      label: "Dwarf (Người Lùn)", 
      desc: "Kỹ thuật, Thể lực bền bỉ",
      uniqueSkill: "Thợ Rèn Thần (Divine Smith)",
      baseSkills: ["Thẩm Định Khoáng Sản", "Kháng Độc", "Chế Tạo Trang Bị", "Nhìn Trong Tối"]
  },
  { 
      id: "Elf", 
      label: "Elf (Tiên Tộc)", 
      desc: "Tinh linh thuật, Cung thủ",
      uniqueSkill: "Cung Thủ Thần (Divine Archer)",
      baseSkills: ["Giao Tiếp Tinh Linh", "Nhìn Xa", "Ma Pháp Gió", "Ẩn Thân"]
  }
];

export const CharacterCreator: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    raceIndex: 0,
    reincarnationReason: '',
    location: ''
  });

  const [showRaceSkills, setShowRaceSkills] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRace = RACES[formData.raceIndex];
    
    // Auto-assign skills based on Race
    const uniqueSkill = selectedRace.uniqueSkill;
    const startingSkills = [uniqueSkill, "Đại Hiền Giả (Great Sage)", ...selectedRace.baseSkills]; // Everyone gets Great Sage implicitly or we can make it part of the race
    
    const newCharacter: Character = {
      name: formData.name,
      race: selectedRace.id,
      uniqueSkill: uniqueSkill,
      reincarnationReason: formData.reincarnationReason || "Đột ngột qua đời ở kiếp trước.",
      location: formData.location || "Hang động Veldora",
      attributes: {
        strength: 10,
        magic: 10,
        agility: 10,
        defense: 10
      },
      status: {
        hp: 100,
        maxHp: 100,
        mp: 100,
        maxMp: 100,
        skills: startingSkills,
        equippedSkills: [uniqueSkill],
        activeEffects: [],
        inventory: ["Hộp Quà Bí Ẩn", "Thảo dược Hipokute x5", "Quần áo cơ bản"],
        quests: [],
        level: 1,
        evolutionStage: `Vô danh (${selectedRace.id})`
      }
    };
    onComplete(newCharacter);
  };

  const currentRace = RACES[formData.raceIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in relative z-10">
      
      {/* Decorative Title */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-cyan-100 system-font tracking-[0.2em] text-shimmer">
           TÁI CẤU TRÚC LINH HỒN
        </h2>
        <div className="h-[1px] w-32 bg-cyan-500/50 mx-auto mt-2"></div>
      </div>

      <div className="raphael-panel w-full max-w-5xl rounded-lg border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
        
        {/* LEFT COLUMN: IDENTITY & RACE */}
        <div className="lg:w-5/12 p-6 md:p-8 bg-slate-900/50 border-r border-cyan-800/30 relative flex flex-col">
            
            {/* Soul Visual */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-8 flex-1">
                {/* 1. Name Input */}
                <div className="group">
                    <label className="block text-[10px] font-bold text-cyan-500 mb-2 uppercase tracking-widest">
                        01. Định Danh Cá Thể
                    </label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-transparent border-b border-cyan-800 py-2 text-2xl font-bold text-cyan-50 placeholder-cyan-900/50 focus:border-cyan-400 focus:outline-none transition-all font-serif"
                        placeholder="Nhập tên..."
                    />
                </div>

                {/* 2. Race Selector */}
                <div>
                    <label className="block text-[10px] font-bold text-cyan-500 mb-3 uppercase tracking-widest">
                        02. Cấu Trúc Vật Chất (Chủng Tộc)
                    </label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {RACES.map((race, idx) => (
                            <div key={race.id} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({...formData, raceIndex: idx});
                                        setShowRaceSkills(false); // Close modal when switching
                                    }}
                                    className={`w-full text-left p-3 rounded-sm border transition-all duration-300 relative overflow-hidden pr-10
                                        ${formData.raceIndex === idx 
                                            ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                                            : 'bg-slate-900/30 border-slate-700 hover:border-cyan-600'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className={`font-bold font-mono text-sm ${formData.raceIndex === idx ? 'text-cyan-100' : 'text-slate-400 group-hover:text-cyan-200'}`}>
                                            {race.label}
                                        </span>
                                        {formData.raceIndex === idx && <span className="text-cyan-400 animate-pulse">●</span>}
                                    </div>
                                    <div className={`text-[10px] mt-1 ${formData.raceIndex === idx ? 'text-cyan-300' : 'text-slate-500'}`}>
                                        {race.desc}
                                    </div>
                                    
                                    {/* Scanline effect on active */}
                                    {formData.raceIndex === idx && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -skew-x-12 translate-x-[-200%] animate-[shineSweep_2s_infinite]"></div>
                                    )}
                                </button>
                                
                                {/* 3-Line Menu Button (Visible only on selected) */}
                                {formData.raceIndex === idx && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowRaceSkills(!showRaceSkills);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 z-20 text-cyan-400 hover:text-white transition-colors"
                                        title="Xem thông tin kỹ năng"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: BACKGROUND & INFO DISPLAY */}
        <div className="lg:w-7/12 p-6 md:p-8 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 relative flex flex-col justify-between">
             
             {/* RACE SKILLS OVERLAY / MODAL */}
             {showRaceSkills && (
                 <div className="absolute inset-4 z-30 bg-black/90 backdrop-blur-md border border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-6 animate-scale-in flex flex-col rounded-md">
                     <div className="flex justify-between items-start mb-4 border-b border-cyan-800 pb-2">
                         <div>
                             <div className="text-[10px] text-cyan-600 uppercase tracking-widest">Dữ liệu phân tích</div>
                             <h3 className="text-xl font-bold text-cyan-100">{currentRace.label}</h3>
                         </div>
                         <button onClick={() => setShowRaceSkills(false)} className="text-cyan-500 hover:text-white">✕</button>
                     </div>
                     
                     <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                         <div>
                             <div className="text-xs font-bold text-yellow-500 uppercase mb-1 flex items-center gap-2">
                                 <span>★ Kỹ Năng Độc Nhất</span>
                             </div>
                             <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-yellow-100 font-mono text-sm">
                                 {currentRace.uniqueSkill}
                             </div>
                         </div>
                         
                         <div>
                             <div className="text-xs font-bold text-cyan-500 uppercase mb-1">
                                 Kỹ Năng Cơ Bản
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 {currentRace.baseSkills.map((skill, i) => (
                                     <div key={i} className="p-2 bg-cyan-900/20 border border-cyan-800/50 rounded text-cyan-200 text-xs font-mono">
                                         • {skill}
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                     
                     <div className="mt-4 text-center">
                         <div className="text-[10px] text-slate-500 italic">
                             *Kỹ năng sẽ tự động được tích hợp vào linh hồn khi bắt đầu.
                         </div>
                     </div>
                 </div>
             )}

             <div className="space-y-8">
                <div className="p-4 bg-cyan-900/10 border border-cyan-500/20 rounded">
                    <h3 className="text-cyan-400 font-bold mb-2 text-sm uppercase tracking-widest">Thông tin khởi tạo</h3>
                    <div className="text-xs text-slate-300 space-y-2">
                        <p><span className="text-cyan-600 font-bold">CHỦNG TỘC:</span> {currentRace.label}</p>
                        <p><span className="text-yellow-600 font-bold">UNIQUE SKILL:</span> {currentRace.uniqueSkill}</p>
                        <p><span className="text-slate-500">Người chơi sẽ bắt đầu với bộ kỹ năng mặc định của chủng tộc này.</span></p>
                    </div>
                </div>

                {/* Background Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-cyan-600 mb-2 uppercase tracking-widest">
                            03. Nguyên Nhân Chuyển Sinh
                        </label>
                        <textarea
                            value={formData.reincarnationReason}
                            onChange={e => setFormData({...formData, reincarnationReason: e.target.value})}
                            className="w-full bg-transparent border border-cyan-900/50 rounded-sm p-3 text-sm text-cyan-100 focus:border-cyan-500 focus:bg-cyan-950/10 focus:outline-none resize-none h-24 custom-scrollbar"
                            placeholder="Chết do tai nạn, làm việc quá sức, hay được triệu hồi..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-cyan-600 mb-2 uppercase tracking-widest">
                            04. Vị Trí Xuất Hiện
                        </label>
                        <textarea
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            className="w-full bg-transparent border border-cyan-900/50 rounded-sm p-3 text-sm text-cyan-100 focus:border-cyan-500 focus:bg-cyan-950/10 focus:outline-none resize-none h-24 custom-scrollbar"
                            placeholder="Trong hang động, rừng Jura, vương quốc Ingrassia..."
                        />
                    </div>
                </div>
             </div>

             {/* ACTIONS */}
             <div className="mt-10 flex gap-4 pt-6 border-t border-cyan-800/30">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onCancel} 
                    className="px-6 text-slate-400 hover:text-white border-slate-700"
                >
                    HỦY BỎ
                </Button>
                <Button 
                    type="submit" 
                    onClick={handleSubmit}
                    className="flex-1 py-3 text-lg bg-cyan-700 hover:bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] tracking-[0.2em] group overflow-hidden"
                >
                    <span className="relative z-10">[ BẮT ĐẦU ]</span>
                </Button>
             </div>

        </div>
      </div>
    </div>
  );
};