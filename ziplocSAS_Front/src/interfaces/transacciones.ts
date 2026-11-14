export type TransaccionTipo = 'RECARGA' | 'RETIRO' | 'TRANSFERENCIA' | 'PAGO_PROGRAMADO' | 'GASTO' | 'BONO';
export type TransaccionEstado = 'PENDIENTE' | 'COMPLETADA' | 'REVERTIDA' | 'FALLIDA';
export type CategoriaGasto =
  | 'ALIMENTACION' | 'TRANSPORTE' | 'SERVICIOS' | 'ENTRETENIMIENTO'
  | 'SALUD' | 'EDUCACION' | 'COMPRAS' | 'OTROS';

export interface Transaccion {
  id: number;
  tipo: TransaccionTipo;
  valor: number;
  estado: TransaccionEstado;
  fecha: string;
  billeteraOrigenId?: number;
  billeteraDestinoId?: number;
  descripcion?: string;
  referencia?: string;
  categoria?: CategoriaGasto;
  comision?: number;
  puntosGenerados?: number;
  hashIntegridad?: string;
}
