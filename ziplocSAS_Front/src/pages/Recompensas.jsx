import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertaPanel from '../components/AlertaPanel';
import { usePuntosRecompensas, useNivelRecompensas, useBeneficios, useCanjeaBeneficio, useHistorialPuntos, useBeneficiosActivos, useResumenRecompensas } from '../hooks/useRecompensas';
import { useBilleteras } from '../hooks/useBilleteras';
import { Check, Lock, Zap, Trophy, Star, TrendingUp, Gift, ChevronRight, Clock, Award, Flame } from 'lucide-react';

/* ─── DATA ──────────────────────────────────────── */
// Catálogo de respaldo (si el backend no responde). Debe coincidir con el catálogo oficial.
const BENEFICIOS = [
  { id: 'DESCUENTO_COMISION_TRANSFERENCIA', descripcion: 'Reducción del 10% en la comisión por transferencias durante 30 días.', nivelRequerido: 'Bronce', puntosNecesarios: 100, tipo: 'DESCUENTO_COMISION_TRANSFERENCIA', activo: true },
  { id: 'RETIROS_SIN_CARGO', descripcion: 'Un mes sin cargos por retiros.', nivelRequerido: 'Bronce', puntosNecesarios: 500, tipo: 'RETIROS_SIN_CARGO', activo: true },
  { id: 'BONO_SALDO', descripcion: 'Bono de saldo de 50 unidades en el monedero que elijas.', nivelRequerido: 'Bronce', puntosNecesarios: 1000, tipo: 'BONO_SALDO', activo: true },
];

const BENEFICIO_META = {
  DESCUENTO_COMISION_TRANSFERENCIA: { label: 'Descuento en transferencias', icono: '⚡', ahorro: '-10% comisión · 30 días' },
  RETIROS_SIN_CARGO:                { label: 'Retiros sin cargo',           icono: '💎', ahorro: '0% comisión retiro · 30 días' },
  BONO_SALDO:                       { label: 'Bono de saldo',               icono: '🎁', ahorro: '+50 de saldo' },
};

const MOV_META = {
  GANADO:     { label: 'Ganados',      color: '#4ade80' },
  BONO_RANGO: { label: 'Bono de rango', color: '#facc15' },
  REVERSION:  { label: 'Reversión',    color: '#f87171' },
  CANJE:      { label: 'Canje',        color: '#818cf8' },
};

const fmtFecha = (d) => d ? new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const pct = (v) => `${(Number(v || 0) * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`;

const LEVELS = ['Bronce', 'Plata', 'Oro', 'Platino'];

// Rangos: Bronce 0–500 · Plata 501–1000 · Oro 1001–5000 · Platino > 5000
const LEVEL_CONFIG = {
  Bronce:  { color: '#C97B2B', glow: 'rgba(201,123,43,0.4)',  num: '#E8963A', bg: 'rgba(201,123,43,0.08)', min: 0,    max: 500,  next: 'Plata',   rango: '0 – 500',     descTransfer: 0,  bonoPuntos: 0  },
  Plata:   { color: '#9CA3AF', glow: 'rgba(156,163,175,0.4)', num: '#D1D5DB', bg: 'rgba(156,163,175,0.08)', min: 501,  max: 1000, next: 'Oro',     rango: '501 – 1.000', descTransfer: 10, bonoPuntos: 5  },
  Oro:     { color: '#D4A017', glow: 'rgba(212,160,23,0.4)',  num: '#F5CC3A', bg: 'rgba(212,160,23,0.08)', min: 1001, max: 5000, next: 'Platino', rango: '1.001 – 5.000', descTransfer: 20, bonoPuntos: 10 },
  Platino: { color: '#818CF8', glow: 'rgba(129,140,248,0.4)', num: '#A5B4FC', bg: 'rgba(129,140,248,0.08)', min: 5001, max: 0,    next: null,      rango: '> 5.000',     descTransfer: 30, bonoPuntos: 20 },
};

function getBeneficioLabel(b) { return BENEFICIO_META[b.tipo]?.label || b.tipo || 'Beneficio'; }
function decorarBeneficio(b) { const m = BENEFICIO_META[b.tipo] || {}; return { icono: m.icono || '🎯', ahorro: m.ahorro, ...b }; }
function extractLevel(d) { if (typeof d === 'string') return d; if (d?.nivel || d?.level) return d.nivel || d.level; return 'Bronce'; }
function extractPoints(d) { if (typeof d === 'number') return d; if (typeof d === 'string' && !isNaN(+d)) return +d; if (d) return +(d.puntosActuales ?? d.puntos ?? d.puntosAcumulados ?? 0); return 0; }

/* ─── ANIMATED COUNTER ─────────────────────────── */
function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = Date.now();
    const from = 0;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <>{display.toLocaleString('es-CO')}</>;
}

/* ─── PARTICLE BURST on redeem ─────────────────── */
function ParticleBurst({ active, color }) {
  if (!active) return null;
  return (
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'inherit' }}>
        {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              position:'absolute', top:'50%', left:'50%',
              width: 6, height: 6, borderRadius:'50%',
              background: color,
              animation: `particle${i % 4} 0.7s ease-out forwards`,
              animationDelay: `${i * 30}ms`,
            }} />
        ))}
      </div>
  );
}

/* ─── HISTORY PANEL (historial de puntos) ─────── */
function HistoryPanel({ movimientos }) {
  if (!movimientos.length) return (
      <div style={{ textAlign:'center', padding:'2rem 0', color:'rgba(255,255,255,0.2)', fontSize:'0.82rem' }}>
        Aún no hay movimientos de puntos.
      </div>
  );
  return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        {movimientos.map((m, i) => {
          const meta = MOV_META[m.tipo] || { label: m.tipo, color: '#fff' };
          const positivo = Number(m.puntos) >= 0;
          return (
              <div key={m.id || i} style={{
                display:'flex', alignItems:'center', gap:'0.75rem',
                padding:'0.75rem 1rem', background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.06)', borderRadius:10,
                animation:`slideIn 0.3s ease both`, animationDelay:`${Math.min(i, 12)*40}ms`
              }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.3rem', minWidth:64, color: positivo ? '#4ade80' : '#f87171' }}>
                  {positivo ? '+' : ''}{Number(m.puntos).toLocaleString('es-CO')}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#fff' }}>
                    <span style={{ color: meta.color }}>{meta.label}</span>{m.descripcion ? ` · ${m.descripcion}` : ''}
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)' }}>{fmtFecha(m.fecha)}</div>
                </div>
                <div className="rw-mono" style={{ textAlign:'right' }}>saldo<br />{Number(m.saldoResultante ?? 0).toLocaleString('es-CO')}</div>
              </div>
          );
        })}
      </div>
  );
}

/* ─── BENEFICIOS ACTIVOS ───────────────────────── */
function ActivosPanel({ activos }) {
  if (!activos.length) return null;
  return (
      <div className="rw-card" style={{ padding:'1.25rem' }}>
        <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Check size={14} style={{ color:'#4ade80' }} /> Beneficios activos
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {activos.map((a) => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0.9rem', background:'rgba(74,222,128,0.05)', border:'1px solid rgba(74,222,128,0.15)', borderRadius:10 }}>
                <span style={{ fontSize:'1.1rem' }}>{BENEFICIO_META[a.tipo]?.icono || '🎯'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:600 }}>{a.descripcion || getBeneficioLabel(a)}</div>
                  <div className="rw-mono">Canjeado {fmtFecha(a.fechaCanje)}</div>
                </div>
                <div className="rw-mono" style={{ color:'#4ade80', textAlign:'right' }}>
                  {a.fechaExpiracion ? <>vence<br />{fmtFecha(a.fechaExpiracion)}</> : 'sin vencimiento'}
                </div>
              </div>
          ))}
        </div>
      </div>
  );
}

/* ─── RADAR / BENEFIT MAP ──────────────────────── */
function BenefitRadar({ points, beneficiosData }) {
  const max = Math.max(...beneficiosData.map(b => b.puntosNecesarios));
  const size = 200;
  const cx = size / 2, cy = size / 2, r = 80;
  const n = beneficiosData.length;
  const pts = beneficiosData.map((b, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const val = Math.min(1, points / b.puntosNecesarios);
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle), full: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, b };
  });
  const polygon = pts.map(p => `${p.x},${p.y}`).join(' ');
  const outerPolygon = pts.map(p => `${p.full.x},${p.full.y}`).join(' ');
  return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible' }}>
        <polygon points={outerPolygon} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        {[0.25, 0.5, 0.75].map(f => {
          const p2 = pts.map((p, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            return `${cx + r * f * Math.cos(angle)},${cy + r * f * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={f} points={p2} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
        })}
        {pts.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.full.x} y2={p.full.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
        <polygon points={polygon} fill="rgba(99,88,255,0.2)" stroke="#6358ff" strokeWidth="1.5" />
        {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill="#6358ff" />
              <text x={p.full.x} y={p.full.y} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
                    dx={p.full.x > cx ? 14 : p.full.x < cx ? -14 : 0}
                    dy={p.full.y > cy ? 12 : p.full.y < cy ? -12 : 0}
              >{p.b.icono}</text>
            </g>
        ))}
      </svg>
  );
}

/* ─── MAIN ─────────────────────────────────────── */
export default function Recompensas({ userId }) {
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [activeTab, setActiveTab] = useState('beneficios');
  const [burstId, setBurstId]   = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [bonoWalletId, setBonoWalletId] = useState('');

  const puntosQuery    = usePuntosRecompensas(userId);
  const nivelQuery     = useNivelRecompensas(userId);
  const beneficiosQuery = useBeneficios();
  const resumenQuery   = useResumenRecompensas(userId);
  const historialQuery = useHistorialPuntos(userId);
  const activosQuery   = useBeneficiosActivos(userId);
  const billeterasQuery = useBilleteras(userId);
  const canjeaMutation  = useCanjeaBeneficio();

  const wallets = Array.isArray(billeterasQuery.data) ? billeterasQuery.data : (billeterasQuery.data?.billeteras || []);
  const activos = Array.isArray(activosQuery.data) ? activosQuery.data : [];
  const movimientos = Array.isArray(historialQuery.data) ? historialQuery.data : [];
  const resumen = resumenQuery.data && typeof resumenQuery.data === 'object' ? resumenQuery.data : null;

  useEffect(() => {
    if (!bonoWalletId && wallets.length > 0) setBonoWalletId(String(wallets[0].id));
  }, [wallets, bonoWalletId]);

  async function handleRedeem(beneficio) {
    try {
      setError(''); setSuccess('');
      const esBono = beneficio.tipo === 'BONO_SALDO';
      if (esBono && !bonoWalletId) { setError('Selecciona la billetera que recibirá el bono.'); return; }
      setBurstId(beneficio.id);
      setTimeout(() => setBurstId(null), 800);
      await canjeaMutation.mutateAsync({
        usuarioId: userId,
        beneficioId: beneficio.id,
        billeteraId: esBono ? bonoWalletId : undefined,
      });
      setSuccess(`✓ ${getBeneficioLabel(beneficio)} canjeado`);
    } catch (e) {
      // El backend explica el motivo en `message` cuando el canje no procede
      setError(e?.message || 'No fue posible canjear.');
    }
  }

  const rawLevel     = extractLevel(resumen?.nivel ?? nivelQuery.data);
  const currentLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();
  const cfg          = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG.Bronce;
  const points       = resumen ? Number(resumen.puntos ?? 0) : extractPoints(puntosQuery.data);
  const levelSpan    = cfg.next ? (cfg.max + 1 - cfg.min) : 0;
  const progress     = cfg.next ? Math.max(0, Math.min(100, Math.round(((points - cfg.min) / levelSpan) * 100))) : 100;
  const faltan       = cfg.next ? (resumen?.puntosParaSiguiente ?? Math.max(0, cfg.max + 1 - points)) : 0;
  const levelIdx     = LEVELS.indexOf(currentLevel);
  const beneficiosRaw = Array.isArray(beneficiosQuery.data) ? beneficiosQuery.data
      : (beneficiosQuery.data?.beneficios || BENEFICIOS);
  const beneficiosData = beneficiosRaw.map(decorarBeneficio);

  const isLoading   = puntosQuery.isLoading || nivelQuery.isLoading || beneficiosQuery.isLoading;
  const isRedeeming = canjeaMutation.isPending;
  const activoIds   = activos.map(a => a.beneficioId);
  // BONO_SALDO es instantáneo: se puede canjear varias veces; los demás quedan "activos" hasta vencer
  const estaActivo  = (b) => b.tipo !== 'BONO_SALDO' && activoIds.includes(b.id);
  const canjesCount = movimientos.filter(m => m.tipo === 'CANJE').length;
  const disponibles = beneficiosData.filter(b => !estaActivo(b) && points >= b.puntosNecesarios).length;

  const TABS = [
    { id: 'beneficios', label: 'Beneficios', icon: Gift },
    { id: 'mapa',       label: 'Mapa de logros', icon: Star },
    { id: 'historial',  label: 'Historial', icon: Clock },
    { id: 'ranking',    label: 'Mi progreso', icon: TrendingUp },
  ];

  return (
      <>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Bebas+Neue&family=JetBrains+Mono:wght@400;600&display=swap');

        .rw-root { font-family: 'Space Grotesk', sans-serif; color: #fff; }

        /* Particle animations */
        @keyframes particle0 { to { transform: translate(-60px,-60px) scale(0); opacity:0; } }
        @keyframes particle1 { to { transform: translate(60px,-60px) scale(0); opacity:0; } }
        @keyframes particle2 { to { transform: translate(60px,60px) scale(0); opacity:0; } }
        @keyframes particle3 { to { transform: translate(-60px,60px) scale(0); opacity:0; } }

        @keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(99,88,255,0.3); } 50% { box-shadow: 0 0 40px rgba(99,88,255,0.6), 0 0 80px rgba(99,88,255,0.2); } }
        @keyframes scanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes countUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes borderRun {
          0%   { clip-path: inset(0 100% 98% 0); }
          25%  { clip-path: inset(0 0 98% 0); }
          50%  { clip-path: inset(0 0 0 98%); }
          75%  { clip-path: inset(98% 0 0 0); }
          100% { clip-path: inset(0 100% 98% 0); }
        }

        .rw-hero-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(5rem, 12vw, 9rem);
          line-height: 0.9;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.4) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: countUp 0.6s ease both;
        }

        .rw-level-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem;
          letter-spacing: 0.15em;
        }

        .rw-tab {
          padding: 0.5rem 1.1rem;
          border-radius: 8px;
          border: 1px solid transparent;
          background: none;
          color: rgba(255,255,255,0.35);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          white-space: nowrap;
        }
        .rw-tab.active {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.12);
          color: #fff;
        }
        .rw-tab:hover:not(.active) { color: rgba(255,255,255,0.65); }

        .rw-card {
          position: relative;
          background: #0e0e0e;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          transition: transform 0.2s, border-color 0.2s;
        }
        .rw-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.14); }

        .rw-card-available {
          border-color: rgba(99,88,255,0.3);
          animation: pulseGlow 3s ease-in-out infinite;
        }

        .rw-btn-redeem {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 8px;
          border: none;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .rw-stat-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .rw-stat-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          line-height: 1;
          color: #fff;
        }

        .rw-stat-lbl {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25);
        }

        .rw-mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.3);
        }

        .rw-scan {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99,88,255,0.6), transparent);
          animation: scanLine 3s linear infinite;
          pointer-events: none;
        }

        .rw-shimmer-text {
          background: linear-gradient(90deg, rgba(255,255,255,0.4) 0%, #fff 40%, rgba(255,255,255,0.4) 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2.5s linear infinite;
        }

        .rw-progress-bar {
          position: relative;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .rw-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 1s cubic-bezier(0.4,0,0.2,1);
          position: relative;
        }
        .rw-progress-fill::after {
          content:'';
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 8px currentColor;
        }

        .rw-level-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          position: relative;
          flex: 1;
        }
        .rw-level-step-line {
          position: absolute;
          top: 14px;
          left: 50%;
          width: 100%;
          height: 2px;
          z-index: 0;
        }

        .rw-achievement {
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          transition: border-color 0.2s;
        }
        .rw-achievement.unlocked { border-color: rgba(99,88,255,0.25); background: rgba(99,88,255,0.05); }

        /* Noise overlay */
        .rw-noise {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }

        .rw-float { animation: float 4s ease-in-out infinite; }
      `}</style>

        <div className="rw-root" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* ── Alerts ── */}
          {error   && <AlertaPanel type="error"   title="Error"           message={error}   />}
          {success && <AlertaPanel type="success" title="¡Canje exitoso!" message={success} />}

          {isLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'5rem 0' }}><LoadingSpinner /></div>
          ) : (<>

            {/* ══════════════════════════════════════
              HERO — bento brutalist
          ══════════════════════════════════════ */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'auto auto', gap:'1rem' }}>

              {/* Big points card */}
              <div className="rw-card" style={{
                gridColumn:'1 / 3', gridRow:'1 / 2',
                padding:'2rem',
                background:`linear-gradient(135deg, #0e0e0e 60%, ${cfg.bg} 100%)`,
                borderColor: cfg.color + '33',
              }}>
                <div className="rw-scan" />
                <div className="rw-noise" />
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div className="rw-mono">ZiplocSAS · FIDELIZACIÓN</div>
                      <div className="rw-level-label rw-shimmer-text" style={{ color: cfg.color, WebkitTextFillColor: cfg.color, background:'none', animation:'none', marginTop:'0.25rem' }}>
                        {currentLevel}
                      </div>
                    </div>
                    {/* Level steps horizontal */}
                    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                      {LEVELS.map((lv, i) => {
                        const c = LEVEL_CONFIG[lv];
                        const done = i <= levelIdx;
                        return (
                            <div key={lv} style={{ display:'flex', alignItems:'center' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius:'50%',
                                border: `2px solid ${done ? c.color : 'rgba(255,255,255,0.1)'}`,
                                background: done ? c.bg : 'transparent',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize: '0.6rem', fontWeight: 700, color: done ? c.color : 'rgba(255,255,255,0.2)',
                                transition:'all 0.3s',
                              }}>
                                {i < levelIdx ? <Check size={11} /> : lv[0]}
                              </div>
                              {i < LEVELS.length - 1 && (
                                  <div style={{ width: 20, height: 2, background: i < levelIdx ? cfg.color : 'rgba(255,255,255,0.08)' }} />
                              )}
                            </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rw-hero-num">
                    <AnimatedNumber value={points} />
                    <span style={{ fontSize:'2rem', fontFamily:"'Bebas Neue',sans-serif", marginLeft:'0.25rem', color:'rgba(255,255,255,0.3)' }}>PTS</span>
                  </div>

                  {/* Progress to next level */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'rgba(255,255,255,0.35)' }}>
                      <span>{cfg.next ? `Hacia ${cfg.next}` : 'Nivel máximo alcanzado'}</span>
                      <span className="rw-mono">{progress}%</span>
                    </div>
                    <div className="rw-progress-bar">
                      <div className="rw-progress-fill" style={{
                        width:`${progress}%`,
                        background:`linear-gradient(90deg, ${cfg.color}, #fff)`,
                      }} />
                    </div>
                    {cfg.next && (
                        <div className="rw-mono">Faltan {Number(faltan).toLocaleString('es-CO')} pts para {cfg.next}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right stat stack */}
              <div style={{ gridColumn:'3 / 4', gridRow:'1 / 2', display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div className="rw-stat-box">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Flame size={14} style={{ color:'#f97316' }} />
                    <span className="rw-stat-lbl">Canjeados</span>
                  </div>
                  <div className="rw-stat-val">{canjesCount}</div>
                  <div className="rw-mono">{activos.length} activos ahora</div>
                </div>
                <div className="rw-stat-box">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Zap size={14} style={{ color:'#facc15' }} />
                    <span className="rw-stat-lbl">Disponibles</span>
                  </div>
                  <div className="rw-stat-val" style={{ color: disponibles > 0 ? '#4ade80' : undefined }}>{disponibles}</div>
                  <div className="rw-mono">para canjear ahora</div>
                </div>
                <div className="rw-stat-box">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Trophy size={14} style={{ color: cfg.color }} />
                    <span className="rw-stat-lbl">Nivel</span>
                  </div>
                  <div className="rw-stat-val" style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.3rem', color: cfg.color }}>{currentLevel}</div>
                  <div className="rw-mono">#{levelIdx + 1} de {LEVELS.length}</div>
                </div>
              </div>
            </div>

            {/* ── Resumen de rango y comisiones ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem' }}>
              <div className="rw-stat-box">
                <span className="rw-stat-lbl">Comisión transferencia</span>
                <div className="rw-stat-val">{pct(resumen?.comisionTransferenciaEfectiva ?? 0.02 * (1 - cfg.descTransfer / 100))}</div>
                <div className="rw-mono">descuento de rango {cfg.descTransfer}%</div>
              </div>
              <div className="rw-stat-box">
                <span className="rw-stat-lbl">Comisión retiro</span>
                <div className="rw-stat-val">{pct(resumen?.comisionRetiroEfectiva ?? 0.01)}</div>
                <div className="rw-mono">0% con "Retiros sin cargo"</div>
              </div>
              <div className="rw-stat-box">
                <span className="rw-stat-lbl">Bono de puntos por rango</span>
                <div className="rw-stat-val">+{pct(resumen?.bonoPuntosNivel ?? cfg.bonoPuntos / 100)}</div>
                <div className="rw-mono">en cada transacción</div>
              </div>
              <div className="rw-stat-box">
                <span className="rw-stat-lbl">Posición en ranking</span>
                <div className="rw-stat-val">{resumen?.posicionRanking ? `#${resumen.posicionRanking}` : '—'}</div>
                <div className="rw-mono">por puntos acumulados</div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                    <button key={t.id} className={`rw-tab ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.id)}>
                      <Icon size={13} />{t.label}
                      {t.id === 'beneficios' && disponibles > 0 && (
                          <span style={{ background:'#6358ff', color:'#fff', borderRadius:999, padding:'0.05rem 0.4rem', fontSize:'0.65rem', fontWeight:700 }}>{disponibles}</span>
                      )}
                    </button>
                );
              })}
            </div>

            {/* ══ PANEL: Beneficios ══ */}
            {activeTab === 'beneficios' && <ActivosPanel activos={activos} />}
            {activeTab === 'beneficios' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem' }}>
                  {beneficiosData.map(b => {
                    const isDone      = estaActivo(b);
                    const canRedeem   = points >= b.puntosNecesarios && b.activo && !isDone;
                    const isLocked    = points < b.puntosNecesarios;
                    const isBursting  = burstId === b.id;
                    return (
                        <div key={b.id}
                             className={`rw-card ${canRedeem ? 'rw-card-available' : ''}`}
                             onMouseEnter={() => setHoveredCard(b.id)}
                             onMouseLeave={() => setHoveredCard(null)}
                        >
                          <ParticleBurst active={isBursting} color={cfg.color} />
                          {isDone && <div className="rw-scan" style={{ background:'linear-gradient(90deg,transparent,rgba(74,222,128,0.5),transparent)' }} />}

                          <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
                            {/* Header */}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
                              <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                                <div style={{ fontSize:'1.8rem', lineHeight:1 }}>{b.icono}</div>
                                <div style={{ fontSize:'0.1rem', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                  Nv. {b.nivelRequerido}
                                </div>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <div style={{
                                  fontFamily:"'Bebas Neue',sans-serif",
                                  fontSize:'2rem', lineHeight:1,
                                  color: isDone ? '#4ade80' : canRedeem ? cfg.color : 'rgba(255,255,255,0.15)',
                                }}>{b.puntosNecesarios}</div>
                                <div className="rw-mono">pts</div>
                              </div>
                            </div>

                            {/* Name + desc */}
                            <div>
                              <div style={{ fontWeight:700, fontSize:'0.9rem', color: isDone ? '#4ade80' : '#fff', marginBottom:'0.35rem' }}>
                                {getBeneficioLabel(b)}
                              </div>
                              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', lineHeight:1.5 }}>{b.descripcion}</div>
                            </div>

                            {/* Saving badge */}
                            {b.ahorro && (
                                <div style={{
                                  display:'inline-flex', alignItems:'center', gap:'0.4rem',
                                  padding:'0.3rem 0.75rem', borderRadius:999,
                                  background: isDone ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                  fontSize:'0.72rem', fontWeight:700,
                                  color: isDone ? '#4ade80' : 'rgba(255,255,255,0.4)',
                                  width:'fit-content',
                                }}>
                                  <TrendingUp size={11} /> Ahorro: {b.ahorro}
                                </div>
                            )}

                            {/* Progress to this benefit */}
                            {!isDone && (
                                <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                                  <div className="rw-progress-bar">
                                    <div className="rw-progress-fill" style={{
                                      width:`${Math.min(100, Math.round((points / b.puntosNecesarios) * 100))}%`,
                                      background: canRedeem
                                          ? `linear-gradient(90deg, ${cfg.color}, #fff)`
                                          : 'rgba(255,255,255,0.2)',
                                    }} />
                                  </div>
                                  <div className="rw-mono" style={{ textAlign:'right' }}>
                                    {Math.min(100, Math.round((points / b.puntosNecesarios) * 100))}%
                                  </div>
                                </div>
                            )}

                            {/* Billetera receptora del bono */}
                            {b.tipo === 'BONO_SALDO' && (
                                <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                                  <span className="rw-mono">Billetera que recibe el bono</span>
                                  <select
                                      value={bonoWalletId}
                                      onChange={e => setBonoWalletId(e.target.value)}
                                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', padding:'0.5rem 0.6rem', fontSize:'0.78rem' }}
                                  >
                                    {wallets.length === 0 && <option value="">Sin billeteras</option>}
                                    {wallets.map(w => <option key={w.id} value={String(w.id)} style={{ color:'#000' }}>{w.nombre}</option>)}
                                  </select>
                                </div>
                            )}

                            {/* CTA */}
                            <button
                                className="rw-btn-redeem"
                                onClick={() => handleRedeem(b)}
                                disabled={isRedeeming || !canRedeem}
                                style={{
                                  background: isDone
                                      ? 'rgba(74,222,128,0.1)'
                                      : canRedeem
                                          ? `linear-gradient(135deg, ${cfg.color}, #fff)`
                                          : 'rgba(255,255,255,0.04)',
                                  color: isDone ? '#4ade80' : canRedeem ? '#000' : 'rgba(255,255,255,0.2)',
                                  border: isDone ? '1px solid rgba(74,222,128,0.2)' : canRedeem ? 'none' : '1px solid rgba(255,255,255,0.07)',
                                  cursor: canRedeem ? 'pointer' : 'not-allowed',
                                }}
                            >
                              {isRedeeming ? 'Procesando…'
                                  : isDone ? '✓ Activo'
                                      : canRedeem ? `Canjear · ${b.puntosNecesarios} pts`
                                          : isLocked ? `🔒 Faltan ${b.puntosNecesarios - points} pts`
                                              : 'No disponible'}
                            </button>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}

            {/* ══ PANEL: Mapa de logros ══ */}
            {activeTab === 'mapa' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  {/* Radar visual */}
                  <div className="rw-card" style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem', alignItems:'center' }}>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', alignSelf:'flex-start' }}>Cobertura de beneficios</div>
                    <div className="rw-float">
                      <BenefitRadar points={points} beneficiosData={beneficiosData} />
                    </div>
                    <div className="rw-mono" style={{ textAlign:'center' }}>
                      {activos.length} beneficio(s) activo(s) · {canjesCount} canje(s) en total
                    </div>
                  </div>

                  {/* Achievements list */}
                  <div className="rw-card" style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    <div style={{ fontWeight:700, fontSize:'0.9rem' }}>Logros</div>
                    {[
                      { label:'Primer canje', desc:'Canjea tu primer beneficio', done: canjesCount >= 1, icon:'🎯' },
                      { label:'Coleccionista', desc:'Canjea 3 beneficios', done: canjesCount >= 3, icon:'🏆' },
                      { label:'Maestro del canje', desc:'Canjea todos los beneficios', done: beneficiosData.length > 0 && canjesCount >= beneficiosData.length, icon:'👑' },
                      { label:'100 puntos', desc:'Acumula 100 puntos', done: points >= 100, icon:'💯' },
                      { label:'Power user', desc:'Alcanza nivel Oro o superior', done: levelIdx >= 2, icon:'⚡' },
                      { label:'Elite', desc:'Alcanza nivel Platino', done: levelIdx >= 3, icon:'💎' },
                    ].map((a, i) => (
                        <div key={i} className={`rw-achievement ${a.done ? 'unlocked' : ''}`}>
                          <div style={{ fontSize:'1.5rem', opacity: a.done ? 1 : 0.2 }}>{a.icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'0.82rem', fontWeight:600, color: a.done ? '#fff' : 'rgba(255,255,255,0.25)' }}>{a.label}</div>
                            <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.25)' }}>{a.desc}</div>
                          </div>
                          {a.done && <Check size={14} style={{ color:'#4ade80', flexShrink:0 }} />}
                          {!a.done && <Lock size={12} style={{ color:'rgba(255,255,255,0.15)', flexShrink:0 }} />}
                        </div>
                    ))}
                  </div>
                </div>
            )}

            {/* ══ PANEL: Historial de puntos ══ */}
            {activeTab === 'historial' && (
                <div className="rw-card" style={{ padding:'1.5rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Clock size={14} style={{ color:'rgba(255,255,255,0.4)' }} />
                    Historial de puntos
                    <span style={{ background:'rgba(255,255,255,0.08)', borderRadius:999, padding:'0.1rem 0.5rem', fontSize:'0.72rem' }}>{movimientos.length}</span>
                  </div>
                  <HistoryPanel movimientos={movimientos} />
                </div>
            )}

            {/* ══ PANEL: Mi progreso ══ */}
            {activeTab === 'ranking' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1rem' }}>
                  {LEVELS.map((lv, i) => {
                    const c = LEVEL_CONFIG[lv];
                    const isCurrentOrPast = i <= levelIdx;
                    const isCurrent = i === levelIdx;
                    return (
                        <div key={lv} className="rw-card" style={{
                          padding:'1.5rem',
                          borderColor: isCurrent ? c.color + '50' : 'rgba(255,255,255,0.07)',
                          background: isCurrent ? c.bg : '#0e0e0e',
                        }}>
                          {isCurrent && <div className="rw-scan" />}
                          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', color: isCurrentOrPast ? c.color : 'rgba(255,255,255,0.15)', letterSpacing:'0.05em' }}>{lv}</div>
                              {isCurrent && <Award size={18} style={{ color: c.color }} />}
                              {i < levelIdx && <Check size={16} style={{ color:'#4ade80' }} />}
                              {i > levelIdx && <Lock size={14} style={{ color:'rgba(255,255,255,0.15)' }} />}
                            </div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'3rem', lineHeight:1, color: isCurrentOrPast ? '#fff' : 'rgba(255,255,255,0.1)' }}>
                              {c.rango}
                            </div>
                            <div className="rw-mono">puntos del rango</div>
                            <div className="rw-mono" style={{ lineHeight:1.6 }}>
                              {c.descTransfer > 0 ? `−${c.descTransfer}% comisión en transferencias` : 'Tarifa estándar'}<br />
                              {c.bonoPuntos > 0 ? `+${c.bonoPuntos}% puntos extra por transacción` : 'Sin bono de puntos'}
                            </div>
                            {isCurrent && cfg.next && (
                                <div style={{ marginTop:'0.5rem' }}>
                                  <div className="rw-progress-bar">
                                    <div className="rw-progress-fill" style={{ width:`${progress}%`, background:`linear-gradient(90deg,${c.color},#fff)` }} />
                                  </div>
                                  <div className="rw-mono" style={{ marginTop:'0.3rem' }}>{progress}% completado</div>
                                </div>
                            )}
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}

          </>)}
        </div>
      </>
  );
}