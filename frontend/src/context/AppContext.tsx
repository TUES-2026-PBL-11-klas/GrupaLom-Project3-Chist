import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from "react";
import { usersApi, reportsApi } from "../services/api.ts";

interface Report {
  id: string;
  reportId?: string;
  title: string;
  location: string;
  district: string;
  lat: number;
  lng: number;
  status: string;
  severity: string;
  img: string;
  points: number;
  reporter: string;
  reporterAvatar: string;
  time: string;
  description: string;
  volunteers: number;
  confirmedBy: string[];
  aiVerified: boolean;
  gps: { lat: number; lng: number };
  claimedBy?: string;
  cleanedBy?: string;
  photoUrl?: string | null;
}

interface FeedItem {
  id: number;
  user: string;
  userAvatar: string;
  action: string;
  place: string;
  pts: string;
  time: string;
  type: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  streak: number;
  level: string;
  levelIcon: string;
  nextLevelPts: number;
  verified: boolean;
  cleanings: number;
  reports: number;
  joined: string;
}

interface Notification {
  id: number;
  type?: string;
  message: string;
  duration?: number;
}

interface AppState {
  user: User;
  reports: Report[];
  activityFeed: FeedItem[];
  notifications: Notification[];
  selectedReportId: string | number | null;
  loading: boolean;
}

type Action =
  | { type: "SET_USER"; payload: User }
  | { type: "SET_REPORTS"; payload: Report[] }
  | { type: "ADD_REPORT"; payload: Record<string, unknown> }
  | { type: "CLAIM_REPORT"; payload: string | number }
  | { type: "COMPLETE_REPORT"; payload: string | number }
  | { type: "SPEND_POINTS"; payload: number }
  | { type: "SELECT_REPORT"; payload: string | number | null }
  | { type: "ADD_NOTIFICATION"; payload: Omit<Notification, "id"> }
  | { type: "DISMISS_NOTIFICATION"; payload: number }
  | { type: "SET_LOADING"; payload: boolean };

const LEVEL_THRESHOLDS = [
  { level: "НОВИЧ", icon: "sprout", min: 0, max: 499 },
  { level: "АКТИВЕН", icon: "award", min: 500, max: 1499 },
  { level: "ПРО", icon: "medal", min: 1500, max: 2999 },
  { level: "МАСТЪР", icon: "gem", min: 3000, max: 4999 },
  { level: "ЛЕГЕНДА", icon: "trophy", min: 5000, max: Infinity },
];

function deriveLevel(points: number) {
  const lvl = LEVEL_THRESHOLDS.find((l) => points >= l.min && points <= l.max) ?? LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((l) => l.min > points);
  return { level: lvl.level, levelIcon: lvl.icon, nextLevelPts: next?.min ?? lvl.max };
}

const POINTS_BY_SEVERITY: Record<string, number> = { critical: 200, high: 120, medium: 80, low: 40 };

const defaultUser: User = {
  id: "", name: "", email: "", avatar: "",
  points: 0, streak: 0, level: "НОВИЧ", levelIcon: "sprout",
  nextLevelPts: 500, verified: false, cleanings: 0, reports: 0, joined: "",
};

const initialState: AppState = {
  user: defaultUser,
  reports: [],
  activityFeed: [],
  notifications: [],
  selectedReportId: null,
  loading: true,
};

function mapApiUser(data: any): User {
  const pts = data.points ?? 0;
  const { level, levelIcon, nextLevelPts } = deriveLevel(pts);
  return {
    id: data.id ?? "",
    name: data.username ?? "",
    email: data.email ?? "",
    avatar: (data.username ?? "??").slice(0, 2).toUpperCase(),
    points: pts,
    streak: data.streak ?? 0,
    level,
    levelIcon,
    nextLevelPts,
    verified: data.role === "VerifiedUser",
    cleanings: data.cleanings ?? 0,
    reports: data.reports ?? 0,
    joined: data.createdAt ? new Date(data.createdAt).toLocaleDateString("bg-BG", { month: "long", year: "numeric" }) : "",
  };
}

function mapApiReport(data: any): Report {
  const sev = data.severity ?? "medium";
  return {
    id: data.reportId ?? data.id ?? "",
    reportId: data.reportId,
    title: data.description ? data.description.slice(0, 50) : "Сигнал",
    location: `${data.latitude?.toFixed(4) ?? 0}°N, ${data.longitude?.toFixed(4) ?? 0}°E`,
    district: data.district ?? "София",
    lat: data.latitude ?? 0,
    lng: data.longitude ?? 0,
    status: (() => {
      const raw = (data.status ?? "open").toUpperCase();
      if (raw === "NEW" || raw === "OPEN") return "open";
      if (raw === "IN_PROGRESS" || raw === "IN-PROGRESS") return "in-progress";
      if (raw === "COMPLETED" || raw === "DONE") return "done";
      return "open";
    })(),
    severity: sev,
    img: "map-pin",
    points: POINTS_BY_SEVERITY[sev] ?? 80,
    reporter: data.reporterName ?? "",
    reporterAvatar: (data.reporterName ?? "??").slice(0, 2).toUpperCase(),
    time: data.createdAt ? new Date(data.createdAt).toLocaleDateString("bg-BG") : "",
    description: data.description ?? "",
    volunteers: 0,
    confirmedBy: [],
    aiVerified: false,
    gps: { lat: data.latitude ?? 0, lng: data.longitude ?? 0 },
    photoUrl: data.photoUrl ?? null,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_REPORTS":
      return { ...state, reports: action.payload };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "ADD_REPORT": {
      const p = action.payload as Record<string, any>;
      const sev = (p.severity as string) ?? "medium";
      const r: Report = {
        id: (p.reportId ?? p.id ?? String(state.reports.length + 1)) as string,
        title: (p.title ?? (p.description ? (p.description as string).slice(0, 40) : "New report")) as string,
        location: (p.location ?? `${(p.latitude as number)?.toFixed(4)}°N, ${(p.longitude as number)?.toFixed(4)}°E`) as string,
        description: (p.description ?? "") as string,
        severity: sev,
        status: "open",
        img: (p.img ?? "map-pin") as string,
        points: POINTS_BY_SEVERITY[sev] ?? 80,
        reporter: state.user.name,
        reporterAvatar: state.user.avatar,
        time: "just now",
        volunteers: 0,
        confirmedBy: [],
        aiVerified: true,
        district: (p.district ?? "Sofia") as string,
        gps: (p.gps ?? { lat: p.latitude, lng: p.longitude }) as { lat: number; lng: number },
        lat: p.latitude as number,
        lng: p.longitude as number,
        photoUrl: (p.photoUrl ?? null) as string | null,
      };
      const feed: FeedItem = {
        id: Date.now(),
        user: state.user.name,
        userAvatar: state.user.avatar,
        action: "докладва",
        place: r.location,
        pts: "+15",
        time: "сега",
        type: "report",
      };
      return {
        ...state,
        reports: [r, ...state.reports],
        activityFeed: [feed, ...state.activityFeed],
        user: {
          ...state.user,
          points: state.user.points + 15,
          reports: state.user.reports + 1,
        },
      };
    }

    case "CLAIM_REPORT":
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.payload
            ? {
                ...r,
                status: "in-progress",
                claimedBy: state.user.name,
                volunteers: r.volunteers + 1,
              }
            : r,
        ),
      };

    case "COMPLETE_REPORT": {
      const rep = state.reports.find((r) => r.id === action.payload);
      const pts = rep?.points ?? 0;
      const feed: FeedItem = {
        id: Date.now(),
        user: state.user.name,
        userAvatar: state.user.avatar,
        action: "почисти",
        place: rep?.location ?? "",
        pts: `+${pts}`,
        time: "сега",
        type: "clean",
      };
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.payload
            ? { ...r, status: "done", cleanedBy: state.user.name }
            : r,
        ),
        activityFeed: [feed, ...state.activityFeed],
        user: {
          ...state.user,
          points: state.user.points + pts,
          cleanings: state.user.cleanings + 1,
        },
      };
    }

    case "SPEND_POINTS":
      return {
        ...state,
        user: {
          ...state.user,
          points: Math.max(0, state.user.points - action.payload),
        },
      };

    case "SELECT_REPORT":
      return { ...state, selectedReportId: action.payload };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [
          { id: Date.now(), ...action.payload },
          ...state.notifications,
        ],
      };

    case "DISMISS_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload,
        ),
      };

    default:
      return state;
  }
}

const AppContext = createContext<any>(null);

export function AppProvider({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reportsRef = useRef(state.reports);
  reportsRef.current = state.reports;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userData, reportsData] = await Promise.all([
          usersApi.getMe(),
          reportsApi.list().catch(() => []),
        ]);
        if (cancelled) return;
        if (userData) {
          dispatch({ type: "SET_USER", payload: mapApiUser(userData) });
        }
        if (Array.isArray(reportsData)) {
          dispatch({ type: "SET_REPORTS", payload: reportsData.map(mapApiReport) });
        }
      } catch {
        // If fetching user fails (401), redirect to login
        onLogout();
      } finally {
        if (!cancelled) dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [onLogout]);

  const addReport = useCallback((data: Record<string, unknown>) => {
    dispatch({ type: "ADD_REPORT", payload: data });
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "success",
        message: "Сигналът е изпратен! +15 точки",
        duration: 3500,
      },
    });
  }, []);

  const claimReport = useCallback((id: string | number) => {
    dispatch({ type: "CLAIM_REPORT", payload: id });
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "info",
        message: "Взел си задачата — успех!",
        duration: 3000,
      },
    });
  }, []);

  const completeReport = useCallback((id: any) => {
    const rep = reportsRef.current.find((r: any) => r.id === id);
    dispatch({ type: "COMPLETE_REPORT", payload: id });
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "success",
        message: `Почистено! +${rep?.points ?? 0} точки`,
        duration: 4000,
      },
    });
  }, []);

  const selectReport = useCallback(
    (id: string | number | null) => dispatch({ type: "SELECT_REPORT", payload: id }),
    [],
  );
  const dismissNotification = useCallback(
    (id: number) => dispatch({ type: "DISMISS_NOTIFICATION", payload: id }),
    [],
  );

  if (state.loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-2)" }}>Loading...</div>;
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        addReport,
        claimReport,
        completeReport,
        selectReport,
        dismissNotification,
        logout: onLogout,
        dispatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
