export const SEVERITY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label:"Критично", color:"#f43f5e", bg:"rgba(244,63,94,0.12)",  border:"rgba(244,63,94,0.3)"   },
  high:     { label:"Сериозно", color:"#fb923c", bg:"rgba(251,146,60,0.12)", border:"rgba(251,146,60,0.3)"  },
  medium:   { label:"Средно",   color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)"  },
  low:      { label:"Леко",     color:"#34d399", bg:"rgba(52,211,153,0.12)", border:"rgba(52,211,153,0.3)"  },
};


export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:          { label:"Отворен",  color:"#60a5fa", bg:"rgba(96,165,250,0.12)" },
  "in-progress": { label:"В процес", color:"#f59e0b", bg:"rgba(245,158,11,0.12)" },
  done:          { label:"Завършен", color:"#34d399", bg:"rgba(52,211,153,0.12)" },
};

export const LEVEL_THRESHOLDS = [
  { level:"НОВИЧ",   icon:"sprout", min:0,    max:499       },
  { level:"АКТИВЕН", icon:"award", min:500,  max:1499      },
  { level:"ПРО",     icon:"medal", min:1500, max:2999      },
  { level:"МАСТЪР",  icon:"gem", min:3000, max:4999      },
  { level:"ЛЕГЕНДА", icon:"trophy", min:5000, max:Infinity  },
];

export const BADGES = [
  { id:"first_report",  icon:"sprout", name:"Първи сигнал",     desc:"Докладва първото замърсяване",    earned:true,  pts:15   },
  { id:"first_clean",   icon:"paintbrush", name:"Първо почистване", desc:"Почисти първото замърсяване",     earned:true,  pts:40   },
  { id:"streak_7",      icon:"flame", name:"7-дневен стрийк",  desc:"Активен 7 последователни дни",    earned:true,  pts:100  },
  { id:"clean_10",      icon:"zap", name:"10 почиствания",   desc:"Завърши 10 успешни почиствания",  earned:false, pts:200  },
  { id:"verified",      icon:"badge-check", name:"Verified User",    desc:"Доказана активност и надеждност",  earned:false, pts:500  },
  { id:"eco_legend",    icon:"globe", name:"Еко легенда",      desc:"Достигни 5000 точки",             earned:false, pts:1000 },
  { id:"district_hero", icon:"building", name:"Герой на района",  desc:"Почисти 5 места в един район",    earned:false, pts:300  },
  { id:"team_player",   icon:"users", name:"Екипен играч",     desc:"Потвърди 20 задачи на другите",   earned:false, pts:250  },
];
