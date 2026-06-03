import { Home, MapPin, Trophy, Gift, User } from "lucide-react";
import "../styles/BottomNav.css";

const TABS = [
  { id: "home", icon: Home, label: "Начало" },
  { id: "reports", icon: MapPin, label: "Сигнали" },
  { id: "board", icon: Trophy, label: "Класация" },
  { id: "rewards", icon: Gift, label: "Награди" },
  { id: "profile", icon: User, label: "Профил" },
];


interface BottomNavProps {
  active: string;
  onChange: (id: string) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Главна навигация">
      {TABS.map((t) => {
        const isActive = active === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className="bottom-nav__btn"
            onClick={() => onChange(t.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`bottom-nav__icon ${
                isActive
                  ? "bottom-nav__icon--active"
                  : "bottom-nav__icon--inactive"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
            </span>
            <span
              className={`bottom-nav__label ${
                isActive
                  ? "bottom-nav__label--active"
                  : "bottom-nav__label--inactive"
              }`}
            >
              {t.label.toUpperCase()}
            </span>
            <span
              className={`bottom-nav__dot ${
                isActive
                  ? "bottom-nav__dot--visible"
                  : "bottom-nav__dot--hidden"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
