package ZiplocSAS.application.service;

import ZiplocSAS.domain.model.Beneficio;
import ZiplocSAS.domain.model.BeneficioCanjeado;
import ZiplocSAS.domain.model.EventoAuditoria;
import ZiplocSAS.domain.model.OperacionProgramada;
import ZiplocSAS.domain.structures.ArbolFidelizacion;
import ZiplocSAS.domain.structures.ColaNotificaciones;
import ZiplocSAS.domain.structures.ColaProgramadas;
import ZiplocSAS.domain.structures.GestorTransacciones;
import ZiplocSAS.domain.structures.GrafoPonderado;
import ZiplocSAS.domain.structures.GrafoTransferencias;
import ZiplocSAS.domain.structures.TablaBilleteras;
import ZiplocSAS.domain.structures.TablaPuntos;
import ZiplocSAS.domain.structures.TablaUsuarios;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Contenedor de estructuras de datos en memoria usadas por la plataforma.
 */
@Getter
@Component
public class PlataformaContext {
    private static final int MAX_NOTIFICACIONES_POR_USUARIO = 30;

    private final TablaUsuarios tablaUsuarios = new TablaUsuarios();
    private final TablaBilleteras tablaBilleteras = new TablaBilleteras();
    private final TablaPuntos tablaPuntos = new TablaPuntos();
    private final GestorTransacciones gestorTransacciones = new GestorTransacciones();
    private final ColaProgramadas colaProgramadas = new ColaProgramadas();
    private final GrafoTransferencias grafoTransferencias = new GrafoTransferencias();
    /** Multimonedero: grafo dirigido billetera -> billetera con el monto transferido. */
    private final GrafoTransferencias grafoBilleteras = new GrafoTransferencias();
    private final ArbolFidelizacion arbolFidelizacion = new ArbolFidelizacion();
    private final List<EventoAuditoria> eventosAuditoria = new ArrayList<>();
    private final List<Beneficio> beneficios = new ArrayList<>();
    private final List<BeneficioCanjeado> beneficiosCanjeados = new ArrayList<>();
    private final List<OperacionProgramada> operacionesProcesadas = new ArrayList<>();
    private final Map<String, ColaNotificaciones> notificacionesPorUsuario = new HashMap<>();
    private final Map<String, GrafoPonderado> grafosGastoPorUsuario = new HashMap<>();
    private final Map<String, String> ultimaCategoriaPorUsuario = new HashMap<>();

    /**
     * Obtiene o crea la cola de notificaciones de un usuario.
     *
     * @param usuarioId identificador del usuario.
     * @return lista circular limitada de notificaciones.
     */
    public ColaNotificaciones colaNotificaciones(String usuarioId) {
        return notificacionesPorUsuario.computeIfAbsent(
                usuarioId,
                ignored -> new ColaNotificaciones(MAX_NOTIFICACIONES_POR_USUARIO)
        );
    }

    /**
     * Obtiene o crea el grafo de patrones de gasto de un usuario.
     *
     * @param usuarioId identificador del usuario.
     * @return grafo con vertices usuario y categorias.
     */
    public GrafoPonderado grafoGastos(String usuarioId) {
        return grafosGastoPorUsuario.computeIfAbsent(usuarioId, id -> new GrafoPonderado("Gastos " + id));
    }

    /**
     * Registra un gasto en el grafo del usuario: arista usuario&rarr;categoria y,
     * si el usuario gasto antes en otra categoria, arista categoriaAnterior&rarr;categoria.
     */
    public synchronized void registrarGasto(String usuarioId, String nombreUsuario, String categoria, double monto) {
        GrafoPonderado grafo = grafoGastos(usuarioId);
        grafo.agregarVertice(usuarioId, nombreUsuario);
        grafo.agregarVertice(categoria, categoria);
        grafo.agregarArista(usuarioId, categoria, monto);
        String anterior = ultimaCategoriaPorUsuario.put(usuarioId, categoria);
        if (anterior != null && !anterior.equals(categoria)) {
            grafo.agregarArista(anterior, categoria, 1);
        }
    }

    /**
     * Revierte el aporte de un gasto sobre la arista usuario&rarr;categoria.
     */
    public synchronized void revertirGasto(String usuarioId, String categoria, double monto) {
        grafoGastos(usuarioId).restarArista(usuarioId, categoria, monto);
    }

    /**
     * Beneficios canjeados por un usuario que siguen vigentes.
     */
    public synchronized List<BeneficioCanjeado> beneficiosVigentes(String usuarioId, LocalDateTime ahora) {
        return beneficiosCanjeados.stream()
                .filter(b -> usuarioId.equals(b.getUsuarioId()))
                .filter(b -> b.vigente(ahora))
                .toList();
    }

    public synchronized void agregarBeneficioCanjeado(BeneficioCanjeado canje) {
        beneficiosCanjeados.add(canje);
    }
}
