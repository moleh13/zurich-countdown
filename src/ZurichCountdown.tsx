import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, MapPin, Clock, Calendar, Share2 } from "lucide-react";

// Hedef: 16 Ekim 2025, 11:35 CEST (Zürih)
const TARGET_ISO = "2025-10-16T11:35:00+02:00"; // +02:00 CEST
// Varış: 16 Ekim 2025, 15:25 TRT (İstanbul)
const ARRIVAL_ISO = "2025-10-16T15:25:00+03:00";
const FLIGHT_NUMBER = "PC948";
const CHECKIN_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;
const ZURICH_TZ = "Europe/Zurich";
const ISTANBUL_TZ = "Europe/Istanbul";
const LOCALE = "tr-TR";

function useCountdown(target: Date) {
  const compute = () => {
    const now = Date.now();
    const diff = target.getTime() - now;
    const clamped = Math.max(diff, 0);
    const seconds = Math.floor(clamped / 1000) % 60;
    const minutes = Math.floor(clamped / (1000 * 60)) % 60;
    const hours = Math.floor(clamped / (1000 * 60 * 60)) % 24;
    const days = Math.floor(clamped / (1000 * 60 * 60 * 24));
    return { total: diff, days, hours, minutes, seconds };
  };

  const [t, setT] = useState(compute);

  useEffect(() => {
    const id = setInterval(() => setT(compute), 1000);
    return () => clearInterval(id);
  }, [target]);

  return t;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function Segment({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-1 min-w-[72px] select-none">
      <div className="absolute inset-0 rounded-2xl bg-white/6 blur-sm" />
      <div className="relative rounded-2xl bg-gradient-to-b from-white/12 to-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] p-3">
        {children}
      </div>
    </div>
  );
}

function FlipDigits({ value, label }: { value: number; label: string }) {
  

  const key = String(value);

  return (
    <Segment>
      <div className="flex justify-center items-center">
        <div className="grid grid-rows-2 gap-0 leading-none">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={key}
              initial={{ rotateX: -90, opacity: 0, y: -8 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              exit={{ rotateX: 90, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="text-6xl md:text-7xl font-extrabold tracking-tight tabular-nums text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
              aria-live="polite"
            >
              {pad2(value)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-2 text-center text-xs uppercase tracking-[0.25em] text-white/70">
        {label}
      </div>
    </Segment>
  );
}

function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#1e293b_0%,#0b1220_40%,#000000_100%)]" />
      {/* Moving orbs */}
      <motion.div
        className="absolute -top-24 -left-24 h-[45vh] w-[45vh] rounded-full bg-[#00E5FF]/10 blur-[60px]"
        animate={{ x: [0, 40, -10, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-[50vh] w-[50vh] rounded-full bg-[#7C3AED]/15 blur-[80px]"
        animate={{ x: [0, -30, 10, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[40vh] w-[40vh] -translate-x-1/2 rounded-full bg-[#10B981]/10 blur-[70px]"
        animate={{ scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Subtle scanlines */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_0,rgba(255,255,255,0.6)_2px,transparent_3px)] bg-[length:100%_12px]" />
    </div>
  );
}

function InfoBadge({ icon: Icon, text }: { icon: React.ComponentType<any>; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/8 backdrop-blur border border-white/10 px-3 py-1.5 text-white/90 text-sm">
      <Icon size={16} className="opacity-80" />
      <span>{text}</span>
    </div>
  );
}

function formatTimeInZone(target: Date, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat(LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    return fmt.format(target);
  } catch {
    return target.toLocaleString();
  }
}

function formatShortDateWithWeekday(target: Date, timeZone: string) {
  try {
    const dateFmt = new Intl.DateTimeFormat(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone,
    });
    const weekdayFmt = new Intl.DateTimeFormat(LOCALE, {
      weekday: "short",
      timeZone,
    });
    return `${dateFmt.format(target)}, ${weekdayFmt.format(target)}`;
  } catch {
    return target.toLocaleString();
  }
}

function formatDateTimeLocal(target: Date) {
  try {
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" });
    return fmt.format(target);
  } catch {
    return target.toLocaleString();
  }
}

function buildICS(): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const departureUtc = new Date(TARGET_ISO).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const arrivalUtc = new Date(ARRIVAL_ISO).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zurich Countdown//EN",
    "BEGIN:VEVENT",
    `UID:zurich-countdown-${Date.now()}@local`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${departureUtc}`,
    `DTEND:${arrivalUtc}`,
    "SUMMARY:PC948 Zürih ✈ İstanbul (Sabiha Gökçen)",
    "DESCRIPTION:İyi yolculuklar",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 70 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const x = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 2 + Math.random() * 1.5;
        const size = 6 + Math.random() * 10;
        const colors = ["#FF3B3B", "#FFD93B", "#6EE7B7", "#60A5FA", "#C084FC"]; // canlı tonlar
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            className="absolute rounded"
            style={{
              left: `${x}%`,
              top: `-10%`,
              width: size,
              height: size,
              background: color,
            }}
            initial={{ y: -50, rotate: 0, opacity: 0 }}
            animate={{ y: "120%", rotate: 360, opacity: 1 }}
            transition={{ duration: dur, delay, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}

export default function ZurichCountdown() {
  const target = useMemo(() => new Date(TARGET_ISO), []);
  const arrival = useMemo(() => new Date(ARRIVAL_ISO), []);
  const { total, days, hours, minutes, seconds } = useCountdown(target);
  const finished = total <= 0;
  const [copied, setCopied] = useState(false);
  const checkInOpensAt = useMemo(() => new Date(target.getTime() - CHECKIN_OFFSET_MS), [target]);
  const departureDateText = formatShortDateWithWeekday(target, ZURICH_TZ);
  const departureTimeText = formatTimeInZone(target, ZURICH_TZ);
  const arrivalDateText = formatShortDateWithWeekday(arrival, ISTANBUL_TZ);
  const arrivalTimeText = formatTimeInZone(arrival, ISTANBUL_TZ);
  const checkInOpensDateText = formatShortDateWithWeekday(checkInOpensAt, ZURICH_TZ);
  const checkInOpensTimeText = formatTimeInZone(checkInOpensAt, ZURICH_TZ);
  const checkInUnlocked = total <= CHECKIN_OFFSET_MS;

  const routeLabel = "Zürih ✈ İstanbul Sabiha Gökçen";
  const checkInMessage = checkInUnlocked
    ? "Online check-in açıldı! Pegasus hesabınızdan koltuğunuzu seçebilirsiniz."
    : "Online check-in uçuşunuza 7 gün kala açılır. Lütfen daha sonra tekrar deneyiniz.";

  const icsHref = useMemo(() => {
    const data = buildICS();
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(data)}`;
  }, []);

  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [finished]);

  return (
    <div className="relative min-h-screen w-full text-white antialiased">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-10 pb-20">
        {/* Başlık bloğu */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <InfoBadge icon={Plane} text={`Uçuş No: ${FLIGHT_NUMBER}`} />
            <InfoBadge icon={MapPin} text={routeLabel} />
            <InfoBadge icon={Clock} text={`Kalkış ${departureDateText} • ${departureTimeText}`} />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                initial={{ scale: 0.9, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="grid place-items-center h-14 w-14 rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-lg"
              >
                <Plane className="text-white" />
              </motion.div>
              <motion.div
                className="absolute -right-2 -bottom-2 h-6 w-6 rounded-full bg-emerald-400 shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.1, 1] }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <div className="text-left">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                PC948 Zürih → İstanbul geri sayımı
              </h1>
              <p className="mt-2 text-white/70 max-w-prose">
                16 Ekim 2025 Perşembe günü 11:35'te Zürih'ten kalkacak ve 15:25'te İstanbul Sabiha Gökçen'e inecek bu uçuş için her saniye kaydediliyor.
              </p>
            </div>
          </div>
        </div>

        {/* Sayaç kartı */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-stretch justify-center">
              <FlipDigits value={days} label="Gün" />
              <FlipDigits value={hours} label="Saat" />
              <FlipDigits value={minutes} label="Dakika" />
              <FlipDigits value={seconds} label="Saniye" />
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 md:gap-4 min-w-[250px]">
              <a
                href={icsHref}
                download="zurich-countdown.ics"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 transition-colors border border-emerald-300/60 shadow"
              >
                <Calendar size={18} /> Takvime ekle
              </a>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {}
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2 transition-colors border border-white/15"
              >
                <Share2 size={18} /> Bağlantıyı kopyala
              </button>
              <div className="text-xs text-white/60 text-center md:text-right">
                Hedef, yerel saatine göre {formatDateTimeLocal(target)} olarak görünebilir.
              </div>
              {copied && (
                <div className="text-xs text-emerald-300">Kopyalandı</div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-left">
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">Uçuş No</div>
              <div className="mt-2 text-2xl font-semibold">{FLIGHT_NUMBER}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-left">
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">Uçuş Tarihi</div>
              <div className="mt-2 text-lg font-semibold">{departureDateText}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-transparent px-4 py-4 text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Zürih</div>
              <div className="mt-1 text-4xl font-bold text-white">{departureTimeText}</div>
              <div className="mt-2 text-xs text-white/60">Kalkış • {departureDateText}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-transparent px-4 py-4 text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">İstanbul Sabiha Gökçen</div>
              <div className="mt-1 text-4xl font-bold text-white">{arrivalTimeText}</div>
              <div className="mt-2 text-xs text-white/60">Varış • {arrivalDateText}</div>
            </div>
          </div>

          <div
            className={`mt-4 rounded-2xl border px-4 py-4 text-sm transition-colors ${
              checkInUnlocked
                ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
                : "border-white/15 bg-white/8 text-white/80"
            }`}
          >
            <div className="font-semibold uppercase tracking-[0.2em] text-xs mb-1">
              Online Check-in
            </div>
            <div>{checkInMessage}</div>
            {!checkInUnlocked && (
              <div className="mt-2 text-xs text-white/60">
                Açılış: {checkInOpensDateText} • {checkInOpensTimeText} (Zürih saati)
              </div>
            )}
          </div>

          {/* İlerleme barı, hedefe yaklaşım */}
          <ProgressToTarget target={new Date(TARGET_ISO)} />

          {/* Bitti mesajı ve konfeti */}
          <AnimatePresence>
            {finished && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 text-center text-lg md:text-xl font-semibold text-emerald-300"
              >
                Uçuş zamanı, iyi yolculuklar.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Confetti show={finished} />
    </div>
  );
}

function ProgressToTarget({ target }: { target: Date }) {
  // Başlangıç olarak bu sayfanın açıldığı zamanı alalım, basit ve tahmin edilebilir
  const startRef = useRef<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = target.getTime() - startRef.current;
  const done = Math.min(Math.max(now - startRef.current, 0), Math.max(total, 1));
  const pct = Math.min(100, Math.max(0, (done / total) * 100));

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-xs text-white/70">
        <span>Şimdi</span>
        <span>Hedefe ilerleme</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10 border border-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400"
          style={{ width: `${pct}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}
