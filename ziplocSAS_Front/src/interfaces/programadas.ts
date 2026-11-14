export type TipoOperacionProgramada = 'RECARGA' | 'RETIRO' | 'TRANSFERENCIA' | 'PAGO_PROGRAMADO' | 'GASTO';
export type Recurrencia = 'NINGUNA' | 'DIARIA' | 'SEMANAL' | 'MENSUAL';

export interface OperacionProgramada {
  id: number;
  fechaEjecucion: string;
  tipo: TipoOperacionProgramada;
  valor: number;
  billeteraDestinoId?: number;
  billeteraOrigenId?: number;
  prioridad: number;
  descripcion?: string;
  estado?: 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';
  recurrencia?: Recurrencia;
  fechaFin?: string | null;
  categoria?: string;
}

export interface OperacionProgramadaRequest {
  fechaEjecucion: string;
  tipo: TipoOperacionProgramada;
  valor: number;
  billeteraDestinoId?: number;
  billeteraOrigenId?: number;
  prioridad: number;
  descripcion?: string;
  recurrencia?: Recurrencia;
  fechaFin?: string | null;
  categoria?: string;
}
