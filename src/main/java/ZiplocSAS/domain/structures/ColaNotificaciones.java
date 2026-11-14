package ZiplocSAS.domain.structures;

import ZiplocSAS.domain.model.Alerta;

import java.util.ArrayList;
import java.util.List;

/**
 * Lista circular simplemente enlazada de capacidad acotada para las notificaciones de un cliente.
 *
 * <p>Solo se conserva el puntero {@code cola} al ultimo nodo; el primero es siempre
 * {@code cola.siguiente}. Encolar es O(1): se enlaza un nodo nuevo despues de la cola.
 * Cuando se alcanza la capacidad, el nodo mas antiguo (la cabeza) se sobrescribe en
 * lugar de crecer, de modo que la lista funciona como una ventana circular de las
 * alertas mas recientes sin reservar memoria adicional.</p>
 */
public class ColaNotificaciones {
    private static class Nodo {
        Alerta alerta;
        Nodo siguiente;

        Nodo(Alerta alerta) {
            this.alerta = alerta;
        }
    }

    /** Ultimo nodo insertado; {@code cola.siguiente} es el mas antiguo. */
    private Nodo cola;
    private int size;
    private final int maxCapacity;

    /**
     * Crea una lista circular con capacidad fija.
     *
     * @param maxCapacity cantidad maxima de alertas retenidas.
     */
    public ColaNotificaciones(int maxCapacity) {
        if (maxCapacity <= 0) {
            throw new IllegalArgumentException("La capacidad debe ser positiva");
        }
        this.maxCapacity = maxCapacity;
    }

    /**
     * Agrega una alerta; si la lista esta llena reemplaza a la mas antigua.
     *
     * @param alerta alerta a registrar.
     */
    public void encolar(Alerta alerta) {
        if (cola == null) {
            Nodo nuevo = new Nodo(alerta);
            nuevo.siguiente = nuevo;
            cola = nuevo;
            size = 1;
        } else if (size == maxCapacity) {
            // Lista llena: la cabeza (mas antigua) se reutiliza como nueva cola, sin crear nodos.
            Nodo cabeza = cola.siguiente;
            cabeza.alerta = alerta;
            cola = cabeza;
        } else {
            Nodo nuevo = new Nodo(alerta);
            nuevo.siguiente = cola.siguiente;
            cola.siguiente = nuevo;
            cola = nuevo;
            size++;
        }
        imprimir("encolar alerta " + alerta.getId());
    }

    /**
     * Retira la alerta mas antigua disponible.
     *
     * @return alerta despachada o {@code null} si la lista esta vacia.
     */
    public Alerta despachar() {
        if (cola == null) {
            imprimir("despachar alerta -> lista vacia");
            return null;
        }
        Nodo cabeza = cola.siguiente;
        Alerta alerta = cabeza.alerta;
        if (cabeza == cola) {
            cola = null;
        } else {
            cola.siguiente = cabeza.siguiente;
        }
        size--;
        imprimir("despachar alerta " + alerta.getId());
        return alerta;
    }

    /**
     * Devuelve una copia ordenada (de la mas antigua a la mas reciente) de las alertas presentes.
     *
     * @return historial reciente de alertas.
     */
    public List<Alerta> historialReciente() {
        List<Alerta> historial = copiar();
        imprimir("consultar historial reciente");
        return historial;
    }

    public boolean estaVacia() {
        return size == 0;
    }

    public boolean estaLlena() {
        return size == maxCapacity;
    }

    public int size() {
        return size;
    }

    public int capacidadMaxima() {
        return maxCapacity;
    }

    private List<Alerta> copiar() {
        List<Alerta> lista = new ArrayList<>(size);
        if (cola == null) {
            return lista;
        }
        Nodo actual = cola.siguiente;
        for (int i = 0; i < size; i++) {
            lista.add(actual.alerta);
            actual = actual.siguiente;
        }
        return lista;
    }

    private void imprimir(String accion) {
        StringBuilder estado = new StringBuilder();
        estado.append("Tipo: Lista circular enlazada (capacidad acotada)").append(System.lineSeparator());
        estado.append("Tamano: ").append(size).append(System.lineSeparator());
        estado.append("Capacidad maxima: ").append(maxCapacity).append(System.lineSeparator());
        int i = 0;
        for (Alerta alerta : copiar()) {
            estado.append(i++).append(". ").append(alerta == null ? "null" : alerta.toString())
                    .append(System.lineSeparator());
        }
        if (size > 0) {
            estado.append("(la cola apunta de nuevo a la cabeza)").append(System.lineSeparator());
        }
        EstructuraConsolePrinter.imprimir("ColaNotificaciones", accion, estado.toString());
    }
}
