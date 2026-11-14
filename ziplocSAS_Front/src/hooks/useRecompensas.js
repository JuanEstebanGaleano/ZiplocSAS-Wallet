import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  obtenerPuntosRecompensas,
  obtenerNivelRecompensas,
  obtenerBeneficios,
  canjearBeneficio,
  obtenerHistorialPuntos,
  obtenerBeneficiosActivos,
  obtenerResumenRecompensas,
} from '../services/api';

// Hook para obtener puntos de recompensa
export function usePuntosRecompensas(usuarioId) {
  return useQuery({
    queryKey: ['recompensas-puntos', usuarioId],
    queryFn: ({ signal }) => obtenerPuntosRecompensas(usuarioId, { signal }),
    enabled: !!usuarioId,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook para obtener nivel de recompensa
export function useNivelRecompensas(usuarioId) {
  return useQuery({
    queryKey: ['recompensas-nivel', usuarioId],
    queryFn: ({ signal }) => obtenerNivelRecompensas(usuarioId, { signal }),
    enabled: !!usuarioId,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook para obtener beneficios disponibles
export function useBeneficios() {
  return useQuery({
    queryKey: ['beneficios'],
    queryFn: ({ signal }) => obtenerBeneficios({ signal }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook para canjear beneficio
export function useCanjeaBeneficio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ usuarioId, beneficioId, billeteraId }) => canjearBeneficio(usuarioId, beneficioId, billeteraId),
    onSuccess: (data, variables) => {
      // Invalidate reward queries after successful redemption
      queryClient.invalidateQueries({ queryKey: ['recompensas-puntos', variables.usuarioId] });
      queryClient.invalidateQueries({ queryKey: ['recompensas-nivel', variables.usuarioId] });
      queryClient.invalidateQueries({ queryKey: ['recompensas-resumen', variables.usuarioId] });
      queryClient.invalidateQueries({ queryKey: ['recompensas-historial', variables.usuarioId] });
      queryClient.invalidateQueries({ queryKey: ['recompensas-activos', variables.usuarioId] });
      queryClient.invalidateQueries({ queryKey: ['billeteras'] });
      queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    },
  });
}

export function useHistorialPuntos(usuarioId) {
  return useQuery({
    queryKey: ['recompensas-historial', usuarioId],
    queryFn: ({ signal }) => obtenerHistorialPuntos(usuarioId, { signal }),
    enabled: !!usuarioId,
    staleTime: 1000 * 30,
  });
}

export function useBeneficiosActivos(usuarioId) {
  return useQuery({
    queryKey: ['recompensas-activos', usuarioId],
    queryFn: ({ signal }) => obtenerBeneficiosActivos(usuarioId, { signal }),
    enabled: !!usuarioId,
    staleTime: 1000 * 30,
  });
}

export function useResumenRecompensas(usuarioId) {
  return useQuery({
    queryKey: ['recompensas-resumen', usuarioId],
    queryFn: ({ signal }) => obtenerResumenRecompensas(usuarioId, { signal }),
    enabled: !!usuarioId,
    staleTime: 1000 * 30,
  });
}
