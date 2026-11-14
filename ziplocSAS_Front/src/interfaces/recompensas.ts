export interface RecompensasInfo {
  puntos: number;
  puntosAcumulados?: number;
  nivel: string;
}

export interface NivelInfo {
  nivel: string;
  puntosActuales: number;
  umbralSiguiente: number;
}

export type TipoBeneficio = 'DESCUENTO_COMISION_TRANSFERENCIA' | 'RETIROS_SIN_CARGO' | 'BONO_SALDO';

export interface Beneficio {
  id: string | number;
  descripcion: string;
  nivelRequerido: string;
  puntosNecesarios: number;
  tipo: TipoBeneficio | string;
  activo: boolean;
}

export interface BeneficioActivo {
  id: string;
  beneficioId: string;
  tipo: TipoBeneficio | string;
  descripcion: string;
  fechaCanje: string;
  fechaExpiracion?: string | null;
}

export interface MovimientoPuntos {
  id: string;
  usuarioId: string;
  fecha: string;
  puntos: number; // con signo
  tipo: 'GANADO' | 'REVERSION' | 'CANJE' | 'BONO_RANGO';
  transaccionId?: string | null;
  descripcion?: string;
  saldoResultante: number;
}

export interface ResumenRecompensas {
  puntos: number;
  nivel: string;
  siguienteNivel: string | null;
  puntosParaSiguiente: number;
  descuentoNivelTransferencia: number; // 0..1
  bonoPuntosNivel: number; // 0..1
  comisionTransferenciaEfectiva: number; // 0..1
  comisionRetiroEfectiva: number; // 0..1
  posicionRanking: number;
}

export interface CanjeResponse {
  mensaje?: string;
  puntosRestantes?: number;
  success?: boolean;
}
