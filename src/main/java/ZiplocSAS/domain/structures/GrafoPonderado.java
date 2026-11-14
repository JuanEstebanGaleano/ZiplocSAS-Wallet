package ZiplocSAS.domain.structures;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Grafo dirigido ponderado con lista de adyacencia.
 *
 * <p>Se reutiliza para dos analisis del enunciado:</p>
 * <ul>
 *   <li><b>Patrones de gasto</b>: vertices cliente y categoria; aristas cliente&rarr;categoria
 *       (monto gastado) y categoria&rarr;categoria (el cliente gasto en A y luego en B).</li>
 *   <li><b>Multimonedero</b>: vertices billetera; aristas billetera&rarr;billetera con el monto transferido.</li>
 * </ul>
 */
public class GrafoPonderado {
    private final String nombre;
    private final Map<String, String> etiquetas = new LinkedHashMap<>();
    private final Map<String, Map<String, Double>> adyacencia = new LinkedHashMap<>();

    public GrafoPonderado(String nombre) {
        this.nombre = nombre;
    }

    /**
     * Agrega un vertice (idempotente).
     *
     * @param id identificador unico.
     * @param etiqueta nombre legible.
     */
    public void agregarVertice(String id, String etiqueta) {
        etiquetas.putIfAbsent(id, etiqueta);
        adyacencia.computeIfAbsent(id, k -> new LinkedHashMap<>());
    }

    /**
     * Suma {@code peso} a la arista origen&rarr;destino, creandola si no existe.
     */
    public void agregarArista(String origen, String destino, double peso) {
        agregarVertice(origen, origen);
        agregarVertice(destino, destino);
        adyacencia.get(origen).merge(destino, peso, Double::sum);
    }

    /**
     * Resta peso a una arista (usado al revertir transacciones); la elimina si queda en cero o menos.
     */
    public void restarArista(String origen, String destino, double peso) {
        Map<String, Double> destinos = adyacencia.get(origen);
        if (destinos == null || !destinos.containsKey(destino)) {
            return;
        }
        double restante = destinos.get(destino) - peso;
        if (restante <= 0.005) {
            destinos.remove(destino);
        } else {
            destinos.put(destino, restante);
        }
    }

    public String etiqueta(String id) {
        return etiquetas.getOrDefault(id, id);
    }

    public Set<String> vertices() {
        return new java.util.LinkedHashSet<>(adyacencia.keySet());
    }

    public Map<String, Double> destinos(String origen) {
        return new LinkedHashMap<>(adyacencia.getOrDefault(origen, Map.of()));
    }

    public double peso(String origen, String destino) {
        return adyacencia.getOrDefault(origen, Map.of()).getOrDefault(destino, 0.0);
    }

    public double gradoSalida(String vertice) {
        return adyacencia.getOrDefault(vertice, Map.of()).values().stream().mapToDouble(Double::doubleValue).sum();
    }

    public double gradoEntrada(String vertice) {
        double total = 0;
        for (Map<String, Double> destinos : adyacencia.values()) {
            total += destinos.getOrDefault(vertice, 0.0);
        }
        return total;
    }

    /**
     * Detecta ciclos dirigidos con DFS recursivo (tres colores).
     *
     * @return {@code true} si existe al menos un ciclo.
     */
    public boolean tieneCiclos() {
        Set<String> visitados = new HashSet<>();
        Set<String> enPila = new HashSet<>();
        for (String v : adyacencia.keySet()) {
            if (!visitados.contains(v) && dfsCiclo(v, visitados, enPila)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Alcanzables desde un vertice con DFS recursivo.
     */
    public List<String> alcanzables(String origen) {
        List<String> resultado = new ArrayList<>();
        dfsAlcanzables(origen, new HashSet<>(), resultado);
        resultado.remove(origen);
        return resultado;
    }

    public int cantidadVertices() {
        return adyacencia.size();
    }

    public int cantidadAristas() {
        return adyacencia.values().stream().mapToInt(Map::size).sum();
    }

    public String nombre() {
        return nombre;
    }

    private boolean dfsCiclo(String v, Set<String> visitados, Set<String> enPila) {
        visitados.add(v);
        enPila.add(v);
        for (String w : adyacencia.getOrDefault(v, Map.of()).keySet()) {
            if (enPila.contains(w)) {
                return true;
            }
            if (!visitados.contains(w) && dfsCiclo(w, visitados, enPila)) {
                return true;
            }
        }
        enPila.remove(v);
        return false;
    }

    private void dfsAlcanzables(String v, Set<String> visitados, List<String> resultado) {
        if (!visitados.add(v)) {
            return;
        }
        resultado.add(v);
        for (String w : adyacencia.getOrDefault(v, Map.of()).keySet()) {
            dfsAlcanzables(w, visitados, resultado);
        }
    }
}
