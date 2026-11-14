package ZiplocSAS.application.service;

import ZiplocSAS.domain.enums.TipoBeneficio;
import ZiplocSAS.domain.enums.TipoTransaccion;
import ZiplocSAS.domain.model.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Calcula las comisiones de transferencias y retiros aplicando el rango del cliente
 * y los beneficios canjeados con puntos.
 *
 * <ul>
 *   <li>Transferencia: 2% base; el rango descuenta 0/10/20/30% (Bronce/Plata/Oro/Platino) y el
 *       beneficio de 100 puntos descuenta un 10% adicional de la comision.</li>
 *   <li>Retiro: 1% base; gratis mientras el beneficio de 500 puntos este vigente.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class PoliticaComisiones {
    public static final double TASA_TRANSFERENCIA = 0.02;
    public static final double TASA_RETIRO = 0.01;
    public static final double DESCUENTO_BENEFICIO_TRANSFERENCIA = 0.10;

    private final SistemaRecompensas sistemaRecompensas;

    /**
     * Tasa efectiva de comision por transferencia para un cliente.
     */
    public double tasaTransferencia(Usuario usuario, LocalDateTime ahora) {
        double tasa = TASA_TRANSFERENCIA * (1.0 - usuario.getNivel().descuentoComisionTransferencia());
        if (sistemaRecompensas.tieneBeneficioActivo(usuario.getId(), TipoBeneficio.DESCUENTO_COMISION_TRANSFERENCIA, ahora)) {
            tasa *= (1.0 - DESCUENTO_BENEFICIO_TRANSFERENCIA);
        }
        return tasa;
    }

    /**
     * Tasa efectiva de comision por retiro para un cliente.
     */
    public double tasaRetiro(Usuario usuario, LocalDateTime ahora) {
        return sistemaRecompensas.tieneBeneficioActivo(usuario.getId(), TipoBeneficio.RETIROS_SIN_CARGO, ahora)
                ? 0.0
                : TASA_RETIRO;
    }

    /**
     * Comision (redondeada a 2 decimales) que paga el origen ademas del valor.
     */
    public double calcular(TipoTransaccion tipo, double valor, Usuario usuario, LocalDateTime ahora) {
        double tasa = switch (tipo) {
            case TRANSFERENCIA, PAGO_PROGRAMADO -> tasaTransferencia(usuario, ahora);
            case RETIRO -> tasaRetiro(usuario, ahora);
            case RECARGA, GASTO, BONO -> 0.0;
        };
        return Math.round(valor * tasa * 100.0) / 100.0;
    }
}
