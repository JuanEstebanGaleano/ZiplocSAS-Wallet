package ZiplocSAS.domain.enums;
/**
 * Niveles de fidelizacion calculados a partir de puntos acumulados.
 */

public enum NivelUsuario {
    BRONCE("Bronce - Entrada"),
    PLATA("Plata - Intermedio"),
    ORO("Oro - Avanzado"),
    PLATINO("Platino - Premium");

    private final String descripcion;

    NivelUsuario(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }

    /**
     * Calcula el rango segun los puntos: Bronce 0-500, Plata 501-1000,
     * Oro 1001-5000 y Platino mas de 5000.
     *
     * @param puntos puntos acumulados.
     * @return rango correspondiente.
     */
    public static NivelUsuario desdePuntos(int puntos) {
        if (puntos > 5000) {
            return PLATINO;
        }
        if (puntos > 1000) {
            return ORO;
        }
        if (puntos > 500) {
            return PLATA;
        }
        return BRONCE;
    }

    /** Descuento sobre la comision de transferencia propio del rango (0..1). */
    public double descuentoComisionTransferencia() {
        return switch (this) {
            case BRONCE -> 0.0;
            case PLATA -> 0.10;
            case ORO -> 0.20;
            case PLATINO -> 0.30;
        };
    }

    /** Bono de puntos extra por transaccion propio del rango (0..1). */
    public double bonoPuntos() {
        return switch (this) {
            case BRONCE -> 0.0;
            case PLATA -> 0.05;
            case ORO -> 0.10;
            case PLATINO -> 0.20;
        };
    }

    /** Siguiente rango, o {@code null} si ya es el maximo. */
    public NivelUsuario siguiente() {
        return ordinal() + 1 < values().length ? values()[ordinal() + 1] : null;
    }

    /** Puntos minimos (exclusivos hacia abajo) para entrar al siguiente rango. */
    public int puntosParaAscender() {
        return switch (this) {
            case BRONCE -> 501;
            case PLATA -> 1001;
            case ORO -> 5001;
            case PLATINO -> Integer.MAX_VALUE;
        };
    }
}
