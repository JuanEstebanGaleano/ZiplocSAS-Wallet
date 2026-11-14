package ZiplocSAS.application.service;

import ZiplocSAS.domain.enums.NivelUsuario;
import ZiplocSAS.domain.enums.TipoBeneficio;
import ZiplocSAS.domain.enums.TipoMovimientoPuntos;
import ZiplocSAS.domain.enums.TipoTransaccion;
import ZiplocSAS.domain.model.Beneficio;
import ZiplocSAS.domain.model.BeneficioCanjeado;
import ZiplocSAS.domain.model.Transaccion;
import ZiplocSAS.domain.model.Usuario;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Servicio de fidelizacion: calculo de puntos, catalogo de beneficios y vigencia de canjes.
 *
 * <p>Puntos: 1 por cada 100 depositados, 2 por cada 100 retirados o gastados y 3 por cada 100
 * transferidos. Ademas cada rango suma un bono porcentual sobre los puntos ganados
 * (Plata 5%, Oro 10%, Platino 20%).</p>
 */
@Service
@RequiredArgsConstructor
public class SistemaRecompensas {
    public static final int DIAS_VIGENCIA = 30;
    public static final double MONTO_BONO_SALDO = 50.0;

    private final PlataformaContext context;
    private final UsuarioService usuarioService;

    /**
     * Inicializa el catalogo del enunciado: 100, 500 y 1000 puntos.
     */
    @PostConstruct
    public void inicializarBeneficios() {
        if (!context.getBeneficios().isEmpty()) {
            return;
        }
        registrarBeneficio("10% menos de comision en transferencias (30 dias)", 100,
                TipoBeneficio.DESCUENTO_COMISION_TRANSFERENCIA);
        registrarBeneficio("Un mes sin cargos por retiros", 500, TipoBeneficio.RETIROS_SIN_CARGO);
        registrarBeneficio("Bono de saldo de 50 unidades", 1000, TipoBeneficio.BONO_SALDO);
    }

    public List<Beneficio> listarBeneficios() {
        return context.getBeneficios();
    }

    /**
     * Puntos base segun tipo y monto (por bloques completos de 100 unidades).
     */
    public int calcularPuntos(TipoTransaccion tipo, double valor) {
        int bloques = (int) Math.floor(valor / 100.0);
        return switch (tipo) {
            case RECARGA -> bloques;
            case RETIRO, GASTO -> bloques * 2;
            case TRANSFERENCIA, PAGO_PROGRAMADO -> bloques * 3;
            case BONO -> 0;
        };
    }

    /**
     * Puntos extra por rango sobre los puntos base.
     */
    public int calcularBonoRango(int puntosBase, NivelUsuario nivel) {
        return (int) Math.floor(puntosBase * nivel.bonoPuntos());
    }

    /**
     * Calcula y acredita los puntos de una transaccion (base + bono de rango) dejando
     * registro de cada movimiento en el historial del cliente.
     */
    public void aplicarPuntos(Transaccion transaccion, String usuarioId) {
        int base = calcularPuntos(transaccion.getTipo(), transaccion.getValor());
        Usuario usuario = usuarioService.obtenerObligatorio(usuarioId);
        int bono = calcularBonoRango(base, usuario.getNivel());
        transaccion.setPuntosGenerados(base + bono);
        if (base > 0) {
            usuarioService.registrarMovimientoPuntos(usuarioId, base, TipoMovimientoPuntos.GANADO,
                    transaccion.getId(), "Puntos por " + transaccion.getTipo().name().toLowerCase());
        }
        if (bono > 0) {
            usuarioService.registrarMovimientoPuntos(usuarioId, bono, TipoMovimientoPuntos.BONO_RANGO,
                    transaccion.getId(), "Bono de rango " + usuario.getNivel().name());
        }
    }

    public Optional<Beneficio> buscarBeneficio(String beneficioId) {
        return context.getBeneficios().stream()
                .filter(beneficio -> beneficio.getId().equals(beneficioId))
                .findFirst();
    }

    public boolean tieneBeneficioActivo(String usuarioId, TipoBeneficio tipo, LocalDateTime ahora) {
        return context.beneficiosVigentes(usuarioId, ahora).stream().anyMatch(b -> b.getTipo() == tipo);
    }

    public List<BeneficioCanjeado> beneficiosActivos(String usuarioId) {
        return context.beneficiosVigentes(usuarioId, LocalDateTime.now());
    }

    private void registrarBeneficio(String descripcion, int puntos, TipoBeneficio tipo) {
        context.getBeneficios().add(Beneficio.builder()
                .id(UUID.randomUUID().toString())
                .descripcion(descripcion)
                .nivelRequerido(NivelUsuario.BRONCE)
                .puntosNecesarios(puntos)
                .tipo(tipo)
                .activo(true)
                .build());
    }
}
