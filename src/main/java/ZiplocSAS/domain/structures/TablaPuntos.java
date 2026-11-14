package ZiplocSAS.domain.structures;

import ZiplocSAS.domain.model.MovimientoPuntos;

import java.util.ArrayList;
import java.util.List;

/**
 * Tabla hash propia (encadenamiento separado) con los puntos de cada cliente y su historial.
 *
 * <p>Da acceso O(1) promedio a los puntos acumulados y a la lista cronologica de
 * movimientos (ganados, revertidos y canjeados) de un cliente.</p>
 */
public class TablaPuntos {
    private static final int CAPACIDAD_INICIAL = 16;
    private static final double FACTOR_CARGA = 0.75;

    /** Cuenta de puntos de un cliente. */
    public static class CuentaPuntos {
        private final String usuarioId;
        private int puntos;
        private final List<MovimientoPuntos> historial = new ArrayList<>();

        CuentaPuntos(String usuarioId) {
            this.usuarioId = usuarioId;
        }

        public String getUsuarioId() {
            return usuarioId;
        }

        public int getPuntos() {
            return puntos;
        }

        public List<MovimientoPuntos> getHistorial() {
            return new ArrayList<>(historial);
        }
    }

    private static class Entry {
        final String key;
        final CuentaPuntos value;
        Entry next;

        Entry(String key, CuentaPuntos value, Entry next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }
    }

    private Entry[] table = new Entry[CAPACIDAD_INICIAL];
    private int size;

    /**
     * Obtiene la cuenta de un cliente, creandola si no existe.
     */
    public CuentaPuntos obtenerOCrear(String usuarioId) {
        CuentaPuntos existente = buscar(usuarioId);
        if (existente != null) {
            return existente;
        }
        if (size >= table.length * FACTOR_CARGA) {
            rehash();
        }
        int idx = indice(usuarioId, table.length);
        CuentaPuntos nueva = new CuentaPuntos(usuarioId);
        table[idx] = new Entry(usuarioId, nueva, table[idx]);
        size++;
        return nueva;
    }

    public CuentaPuntos buscar(String usuarioId) {
        for (Entry e = table[indice(usuarioId, table.length)]; e != null; e = e.next) {
            if (e.key.equals(usuarioId)) {
                return e.value;
            }
        }
        return null;
    }

    /**
     * Fija el total vigente de puntos (sincronizacion desde el usuario).
     */
    public void fijarPuntos(String usuarioId, int puntos) {
        obtenerOCrear(usuarioId).puntos = puntos;
    }

    /**
     * Registra un movimiento en el historial y actualiza el total.
     */
    public void registrar(MovimientoPuntos movimiento) {
        CuentaPuntos cuenta = obtenerOCrear(movimiento.getUsuarioId());
        cuenta.historial.add(movimiento);
        cuenta.puntos = movimiento.getSaldoResultante();
    }

    /**
     * Carga un movimiento ya persistido sin alterar el total (se usa al arrancar).
     */
    public void cargarMovimiento(MovimientoPuntos movimiento) {
        obtenerOCrear(movimiento.getUsuarioId()).historial.add(movimiento);
    }

    public int size() {
        return size;
    }

    private void rehash() {
        Entry[] anterior = table;
        table = new Entry[anterior.length * 2];
        for (Entry cabeza : anterior) {
            for (Entry e = cabeza; e != null; ) {
                Entry siguiente = e.next;
                int idx = indice(e.key, table.length);
                e.next = table[idx];
                table[idx] = e;
                e = siguiente;
            }
        }
    }

    private static int indice(String key, int capacidad) {
        return (key.hashCode() & 0x7fffffff) % capacidad;
    }
}
