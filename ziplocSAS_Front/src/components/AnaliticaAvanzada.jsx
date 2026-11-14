import { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import LoadingSpinner from './LoadingSpinner';
import {
  useGastosAnalitica,
  useGrafoBilleterasAnalitica,
  useVerificarIntegridad,
} from '../hooks/useAnalitica';

/* Tokens alineados con pages/Analitica.jsx */
const T = {
  surface: '#0C0C12', card: '#0F0F17',
  border: 'rgba(255,255,255,0.06)',
  acid: '#C8FF00', red: '#FF2D55', blue: '#0AF', amber: '#FFAA00',
  text: 'rgba(255,255,255,0.9)', textDim: 'rgba(255,255,255,0.4)', textFaint: 'rgba(255,255,255,0.18)',
};
const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const fmtMoney = (n) => `$ ${Number(n || 0).toLocaleString('es-CO')}`;

const CAT_LABELS = {
  ALIMENTACION: 'Alimentación', TRANSPORTE: 'Transporte', SERVICIOS: 'Servicios',
  ENTRETENIMIENTO: 'Entretenimiento', SALUD: 'Salud', EDUCACION: 'Educación',
  COMPRAS: 'Compras', OTROS: 'Otros',
};
const catLabel = (c) => CAT_LABELS[c] || c;

function Panel({ title, tag, accent = T.acid, children, style = {} }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 22px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 16, background: accent, borderRadius: 2, boxShadow: `0 0 8px ${accent}` }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text }}>
            {title}
          </span>
        </div>
        {tag && <span style={{ ...mono, fontSize: 10, color: accent, letterSpacing: '0.1em' }}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ ...mono, fontSize: 11, color: T.textFaint, textAlign: 'center', padding: '18px 0' }}>{text}</div>;
}

/* Grafo dirigido reutilizando el estilo del grafo existente */
function Grafo({ nodos = [], enlaces = [], colorPorTipo }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!ref.current) return undefined;
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const data = useMemo(() => {
    const nodes = nodos.map((n) => ({ ...n, id: String(n.id), name: n.nombre || String(n.id) }));
    const ids = new Set(nodes.map((n) => n.id));
    const links = enlaces
      .filter((e) => ids.has(String(e.origen)) && ids.has(String(e.destino)))
      .map((e) => ({ source: String(e.origen), target: String(e.destino), monto: e.monto }));
    return { nodes, links };
  }, [nodos, enlaces]);

  if (!nodos.length) return <Empty text="sin datos de grafo disponibles" />;

  const colorDe = (n) => (colorPorTipo && colorPorTipo[n.tipo]) || '#5B8DEF';

  return (
    <div ref={ref} style={{ background: '#0D1117', borderRadius: 8, overflow: 'hidden' }}>
      <ForceGraph2D
        width={width}
        height={320}
        graphData={data}
        nodeLabel="name"
        linkLabel={(l) => `Monto: ${fmtMoney(l.monto)}`}
        linkColor={() => 'rgba(180,180,180,0.55)'}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={1.5}
        backgroundColor="#0D1117"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const color = colorDe(node);
          const r = 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI, false);
          ctx.strokeStyle = `${color}44`;
          ctx.lineWidth = 2;
          ctx.stroke();
          if (globalScale > 0.6) {
            const fontSize = Math.max(10, 12 / globalScale);
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = '#C8C8C8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.name, node.x, node.y + r + fontSize);
          }
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
      />
    </div>
  );
}

function BarraCategoria({ label, value, max, total }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const share = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
      <div style={{ fontSize: 12, color: T.textDim, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: T.amber, borderRadius: 3, boxShadow: `0 0 6px ${T.amber}80`, transition: 'width 0.6s' }} />
      </div>
      <div style={{ ...mono, fontSize: 11, color: T.textDim, width: 110, textAlign: 'right', flexShrink: 0 }}>
        {fmtMoney(value)} · {share}%
      </div>
    </div>
  );
}

function PatronesGasto({ userId }) {
  const q = useGastosAnalitica(userId);
  const data = q.data || {};
  const porCategoria = data.porCategoria || {};
  const entradas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const max = entradas.length ? entradas[0][1] : 0;
  const nodos = data.grafo?.nodos || [];
  const enlaces = data.grafo?.enlaces || [];

  return (
    <Panel title="Patrones de gasto" tag={`${nodos.length} nodos · ${enlaces.length} aristas`} accent={T.amber}>
      {q.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingSpinner /></div>
      ) : q.error ? (
        <Empty text={q.error.message || 'No fue posible cargar los gastos'} />
      ) : !entradas.length ? (
        <Empty text="aún no hay gastos registrados" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Total gastado</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{fmtMoney(data.totalGastado)}</div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Categoría principal</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.amber }}>{data.categoriaPrincipal ? catLabel(data.categoriaPrincipal) : '—'}</div>
            </div>
          </div>
          <div>
            {entradas.map(([cat, monto]) => (
              <BarraCategoria key={cat} label={catLabel(cat)} value={monto} max={max} total={Number(data.totalGastado || 0)} />
            ))}
          </div>
          <div>
            <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginBottom: 8 }}>
              Grafo dirigido: usuario → categoría y categoría → categoría (secuencia de gastos)
            </div>
            <Grafo nodos={nodos} enlaces={enlaces} colorPorTipo={{ USUARIO: '#5B8DEF', CATEGORIA: T.amber }} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function GrafoMonederos() {
  const q = useGrafoBilleterasAnalitica();
  const nodos = q.data?.nodos || [];
  const enlaces = q.data?.enlaces || [];
  return (
    <Panel title="Grafo de monederos" tag={`${nodos.length} monederos · ${enlaces.length} flujos`} accent={T.blue}>
      {q.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingSpinner /></div>
      ) : q.error ? (
        <Empty text={q.error.message || 'No fue posible cargar el grafo de monederos'} />
      ) : (
        <Grafo nodos={nodos} enlaces={enlaces} />
      )}
    </Panel>
  );
}

function PanelIntegridad() {
  const mutation = useVerificarIntegridad();
  // Si hay inconsistencias el backend responde success=false: el detalle llega en error.data.
  const r = mutation.data ?? mutation.error?.data;
  const ok = r?.integridadCorrecta;
  const color = r ? (ok ? '#4ADE80' : T.red) : T.textDim;

  return (
    <Panel title="Verificación de integridad" tag="ALGORITMO RECURSIVO" accent={T.acid}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: r ? 16 : 0 }}>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          style={{
            background: T.acid, color: '#000', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 700, fontSize: 12, cursor: mutation.isPending ? 'wait' : 'pointer',
            opacity: mutation.isPending ? 0.6 : 1,
          }}
        >
          {mutation.isPending ? 'Verificando…' : 'Verificar ahora'}
        </button>
        <span style={{ ...mono, fontSize: 11, color: T.textDim }}>
          Divide y vencerás: valida recursivamente cada transacción del historial (campos, estado, puntos, comisión).
        </span>
      </div>

      {mutation.error && !r && (
        <div style={{ ...mono, fontSize: 11, color: T.red, marginTop: 10 }}>{mutation.error.message}</div>
      )}

      {r && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            border: `1px solid ${color}55`, background: `${color}12`, color, borderRadius: 8,
            padding: '10px 14px', fontWeight: 700, fontSize: 13,
          }}>
            {ok ? '✓ Integridad verificada: no se detectaron inconsistencias' : '✗ Se detectaron inconsistencias'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
            {[
              ['Transacciones', r.totalTransacciones],
              ['Válidas', r.transaccionesValidas],
              ['Inválidas', r.transaccionesInvalidas],
            ].map(([k, v]) => (
              <div key={k} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ ...mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{v ?? 0}</div>
              </div>
            ))}
          </div>
          {(r.errores?.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(r.errores || []).map((e, i) => (
                <div key={`e${i}`} style={{ ...mono, fontSize: 11, color: T.red }}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function AnaliticaAvanzada({ userId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PatronesGasto userId={userId} />
      <GrafoMonederos />
      <PanelIntegridad />
    </div>
  );
}
