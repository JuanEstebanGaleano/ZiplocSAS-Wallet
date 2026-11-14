package ZiplocSAS.domain.enums;

/**
 * Tipos de beneficios canjeables con puntos (catalogo del enunciado).
 */
public enum TipoBeneficio {
    /** 100 puntos: reduce 10% la comision de transferencias durante 30 dias. */
    DESCUENTO_COMISION_TRANSFERENCIA("10% off transfer commission"),
    /** 500 puntos: un mes sin cargos por retiros. */
    RETIROS_SIN_CARGO("One month without withdrawal fees"),
    /** 1000 puntos: bono de 50 unidades en una billetera. */
    BONO_SALDO("Balance bonus");

    private final String descripcion;

    TipoBeneficio(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
