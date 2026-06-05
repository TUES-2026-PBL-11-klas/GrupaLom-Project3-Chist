"use client";

import { createContext, useContext, useMemo, useReducer } from "react";

export interface Notification {
  id: number;
  type?: "success" | "info" | "error";
  message: string;
  duration?: number;
}

export interface Filters {
  severity: string | null;
  status: string | null;
}

interface UIState {
  selectedReportId: string | null;
  filters: Filters;
  notifications: Notification[];
}

type UIAction =
  | { type: "SELECT_REPORT"; payload: string | null }
  | { type: "SET_FILTER_SEVERITY"; payload: string | null }
  | { type: "SET_FILTER_STATUS"; payload: string | null }
  | { type: "PUSH_NOTIFICATION"; payload: Omit<Notification, "id"> }
  | { type: "DISMISS_NOTIFICATION"; payload: number };

const initialState: UIState = {
  selectedReportId: null,
  filters: { severity: null, status: null },
  notifications: [],
};

function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SELECT_REPORT":
      return { ...state, selectedReportId: action.payload };
    case "SET_FILTER_SEVERITY":
      return { ...state, filters: { ...state.filters, severity: action.payload } };
    case "SET_FILTER_STATUS":
      return { ...state, filters: { ...state.filters, status: action.payload } };
    case "PUSH_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, { ...action.payload, id: Date.now() + Math.random() }],
      };
    case "DISMISS_NOTIFICATION":
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.payload) };
  }
}

interface AppContextValue extends UIState {
  selectReport: (id: string | null) => void;
  setSeverityFilter: (sev: string | null) => void;
  setStatusFilter: (s: string | null) => void;
  pushNotification: (n: Omit<Notification, "id">) => void;
  dismissNotification: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      selectReport: (id) => dispatch({ type: "SELECT_REPORT", payload: id }),
      setSeverityFilter: (sev) => dispatch({ type: "SET_FILTER_SEVERITY", payload: sev }),
      setStatusFilter: (s) => dispatch({ type: "SET_FILTER_STATUS", payload: s }),
      pushNotification: (n) => dispatch({ type: "PUSH_NOTIFICATION", payload: n }),
      dismissNotification: (id) => dispatch({ type: "DISMISS_NOTIFICATION", payload: id }),
    }),
    [state]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
