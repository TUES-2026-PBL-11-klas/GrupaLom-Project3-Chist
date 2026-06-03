import { useState, useRef, useCallback } from "react";
import { PartyPopper, Leaf, Star, Flame, Trophy, X, MapPin, Satellite, Camera, Bot, CheckCircle, CircleX, Loader2, Check } from "lucide-react";
import DataIcon from "./DataIcon.tsx";
import "../styles/CleanModal.css";
import { SEVERITY_META } from "../data/constants.ts";
import { useApp } from "../context/AppContext.tsx";


interface CleanModalReport {
  id: string | number;
  title: string;
  location: string;
  severity: string;
  img: string;
  points: number;
}

interface CleanModalProps {
  report: CleanModalReport | null;
  onClose: () => void;
}

export default function CleanModal({ report, onClose }: CleanModalProps) {
  const { completeReport } = useApp();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [gpsOk, setGpsOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!report) return null;
  const meta = SEVERITY_META[report.severity as keyof typeof SEVERITY_META] ?? SEVERITY_META.medium;

  const handleFile = (f: File | undefined) => {
    if (!f?.type.startsWith("image/")) return;
    setPhotoUrl(URL.createObjectURL(f));
    setAiResult("pending");
    setTimeout(() => {
      setGpsOk(true);
      setAiResult("pass");
    }, 1800);
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      completeReport(report.id);
      setLoading(false);
      setDone(true);
    }, 1200);
  };

  /* ── Swipe-to-close on mobile handle ── */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragY.current = e.touches[0].clientY;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const dy = e.changedTouches[0].clientY - dragY.current;
    sheetRef.current.style.transition = "transform 0.25s ease";
    if (dy > 100) {
      sheetRef.current.style.transform = `translateY(100%)`;
      setTimeout(onClose, 250);
    } else {
      sheetRef.current.style.transform = "";
    }
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-sheet" ref={sheetRef}>
        <div
          className="modal-handle"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        {done ? (
          <div className="success-screen">
            <div className="success-screen__emoji"><PartyPopper size={52} strokeWidth={1.5} /></div>
            <div className="success-screen__title">ЗАВЪРШЕНО!</div>
            <div className="success-screen__body">
              +{report.points} точки добавени!
              <br />
              Благодарим, Sofia е по-чиста с теб!
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                marginTop: 16,
              }}
            >
              {[Star, Flame, Trophy].map((Icon, i) => (
                <span
                  key={i}
                  style={{
                    animation: `floatY ${1.5 + i * 0.3}s ease-in-out infinite`,
                    display: "inline-flex",
                  }}
                >
                  <Icon size={28} strokeWidth={1.5} />
                </span>
              ))}
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 24, padding: "12px 40px", fontSize: 13 }}
              onClick={onClose}
            >
              ЗАТВОРИ
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div>
                <div className="modal-title">ЗАВЪРШИ ЗАДАЧАТА</div>
                <div className="label-caps" style={{ marginTop: 3 }}>
                  +{report.points} ТОЧКИ ПРИ УСПЕХ
                </div>
              </div>
              <button className="modal-close" onClick={onClose}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div
              className="clean-modal__task-info"
              style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
              }}
            >
              <span className="clean-modal__task-icon"><DataIcon name={report.img} size={18} /></span>
              <div>
                <div className="clean-modal__task-title">{report.title}</div>
                <div className="clean-modal__task-loc">
                  <MapPin size={12} strokeWidth={2} /> {report.location}
                </div>
              </div>
              <span
                className="clean-modal__task-sev"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                  color: meta.color,
                }}
              >
                {meta.label}
              </span>
            </div>

            <div className="clean-modal__steps">
              <div
                className={`clean-modal__step ${
                  gpsOk ? "clean-modal__step--ok" : "clean-modal__step--pending"
                }`}
              >
                <span className="clean-modal__step-icon"><Satellite size={16} strokeWidth={1.8} /></span>
                <div className="clean-modal__step-body">
                  <div className="clean-modal__step-title">GPS Верификация</div>
                  <div className="clean-modal__step-detail">
                    {gpsOk
                      ? "42.6977° N, 23.3219° E · ±5м"
                      : "Изчакване на локация…"}
                  </div>
                </div>
                <span
                  className="clean-modal__step-badge"
                  style={{
                    color: gpsOk ? "var(--text-1)" : "var(--text-3)",
                  }}
                >
                  {gpsOk ? <><Check size={12} strokeWidth={3} /> OK</> : <Loader2 size={14} strokeWidth={2} className="spinner" />}
                </span>
              </div>

              <div>
                <label className="label-caps clean-modal__photo-label">
                  Снимка "СЛЕД" почистването
                </label>
                <div
                  className={`drop-zone ${
                    photoUrl ? "drop-zone--has-file" : ""
                  }`}
                  onClick={() => inputRef.current?.click()}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="After"
                      style={{
                        width: "100%",
                        maxHeight: 180,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <>
                      <span className="drop-zone__icon"><Camera size={32} strokeWidth={1.5} /></span>
                      <span className="drop-zone__label">
                        Снимай почистеното място
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {aiResult && (
                <div className={`clean-modal__ai clean-modal__ai--${aiResult}`}>
                  <span className="clean-modal__ai-icon"><Bot size={18} strokeWidth={1.8} /></span>
                  <div>
                    <div
                      className="clean-modal__ai-title"
                      style={{
                        color:
                          aiResult === "pass"
                            ? "var(--text-1)"
                            : aiResult === "fail"
                              ? "var(--red)"
                              : "var(--text-2)",
                      }}
                    >
                      Azure Computer Vision
                    </div>
                    <div className="clean-modal__ai-desc">
                      {aiResult === "pending" && "Анализиране на снимката…"}
                      {aiResult === "pass" &&
                        "Чисто! Местото изглежда почистено."}
                      {aiResult === "fail" &&
                        "Снимката не показва почистено място."}
                    </div>
                  </div>
                  {aiResult === "pending" && (
                    <Loader2 size={18} strokeWidth={2} className="spinner" style={{ color: "var(--text-2)" }} />
                  )}
                  {aiResult === "pass" && (
                    <div className="clean-modal__ai-score">97% <Check size={12} strokeWidth={3} /></div>
                  )}
                </div>
              )}
            </div>

            <button
              className="btn-primary clean-modal__submit"
              disabled={!photoUrl || aiResult !== "pass" || loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 size={14} strokeWidth={2} className="spinner" /> Изпращане…
                </>
              ) : (
                <>
                  <CheckCircle size={14} strokeWidth={2} /> ПОТВЪРДИ ПОЧИСТВАНЕТО (+{report.points} pts)
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
