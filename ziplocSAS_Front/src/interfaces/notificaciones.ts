export interface Notificacion {
  id: number;
  usuarioId: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  tipo?: string;
}

export interface Alerta {
  id: number;
  usuarioId: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export type TipoAlerta =
  | 'TRANSACCION_COMPLETADA' | 'TRANSACCION_FALLIDA' | 'SALDO_BAJO' | 'ACCESO_INUSUAL'
  | 'BENEFICIO_DISPONIBLE' | 'LIMITE_EXCEDIDO' | 'RECORDATORIO_PROGRAMADA';
