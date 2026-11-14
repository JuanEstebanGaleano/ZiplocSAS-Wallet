package ZiplocSAS.application.service;

import ZiplocSAS.domain.enums.EstadoBilletera;
import ZiplocSAS.domain.enums.NivelUsuario;
import ZiplocSAS.domain.enums.TipoAlerta;
import ZiplocSAS.domain.enums.TipoBeneficio;
import ZiplocSAS.domain.enums.TipoMovimientoPuntos;
import ZiplocSAS.domain.enums.TipoTransaccion;
import ZiplocSAS.domain.model.Beneficio;
import ZiplocSAS.domain.model.BeneficioCanjeado;
import ZiplocSAS.domain.model.Billetera;
import ZiplocSAS.domain.model.Transaccion;
import ZiplocSAS.domain.model.Usuario;
import ZiplocSAS.infrastructure.repository.BeneficioCanjeadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orquesta el canje de puntos por beneficios y el resumen de fidelizacion del cliente.
 */
@Service
@RequiredArgsConstructor
public class CanjeService {
    private final PlataformaContext context;
    private final UsuarioService usuarioService;
    private final BilleteraService billeteraService;
    private final TransaccionService transaccionService;
    private final SistemaRecompensas sistemaRecompensas;
    private final PoliticaComisiones politicaComisiones;
    private final NotificacionService notificacionService;
    private final BeneficioCanjeadoRepository beneficioCanjeadoRepository;

    /**
     * Canjea puntos por un beneficio.
     *
     * @param usuarioId cliente que canjea.
     * @param beneficioId beneficio del catalogo.
     * @param billeteraId billetera que recibe el bono (solo para BONO_SALDO; si es null se usa la primera activa).
     * @return canje registrado.
     * @throws IllegalArgumentException con el motivo si no es posible canjear.
     */
    public synchronized BeneficioCanjeado canjear(String usuarioId, String beneficioId, String billeteraId) {
        Usuario usuario = usuarioService.obtenerObligatorio(usuarioId);
        Beneficio beneficio = sistemaRecompensas.buscarBeneficio(beneficioId)
                .filter(Beneficio::isActivo)
                .orElseThrow(() -> new IllegalArgumentException("El beneficio no esta disponible"));
        if (usuario.getPuntosAcumulados() < beneficio.getPuntosNecesarios()) {
            throw new IllegalArgumentException("Puntos insuficientes: necesitas " + beneficio.getPuntosNecesarios()
                    + " y tienes " + usuario.getPuntosAcumulados());
        }
        LocalDateTime ahora = LocalDateTime.now();
        if (beneficio.getTipo() != TipoBeneficio.BONO_SALDO
                && sistemaRecompensas.tieneBeneficioActivo(usuarioId, beneficio.getTipo(), ahora)) {
            throw new IllegalArgumentException("Ya tienes este beneficio activo");
        }

        if (beneficio.getTipo() == TipoBeneficio.BONO_SALDO) {
            Billetera destino = elegirBilletera(usuarioId, billeteraId);
            transaccionService.crear(Transaccion.builder()
                    .tipo(TipoTransaccion.BONO)
                    .valor(SistemaRecompensas.MONTO_BONO_SALDO)
                    .billeteraDestinoId(destino.getId())
                    .build());
        }

        usuarioService.registrarMovimientoPuntos(usuarioId, -beneficio.getPuntosNecesarios(),
                TipoMovimientoPuntos.CANJE, null, "Canje: " + beneficio.getDescripcion());

        BeneficioCanjeado canje = BeneficioCanjeado.builder()
                .id(UUID.randomUUID().toString())
                .usuarioId(usuarioId)
                .beneficioId(beneficioId)
                .tipo(beneficio.getTipo())
                .descripcion(beneficio.getDescripcion())
                .fechaCanje(ahora)
                .fechaExpiracion(beneficio.getTipo() == TipoBeneficio.BONO_SALDO
                        ? ahora
                        : ahora.plusDays(SistemaRecompensas.DIAS_VIGENCIA))
                .build();
        beneficioCanjeadoRepository.save(canje);
        context.agregarBeneficioCanjeado(canje);
        notificacionService.crear(usuarioId, TipoAlerta.BENEFICIO_DISPONIBLE,
                "Beneficio canjeado: " + beneficio.getDescripcion());
        return canje;
    }

    /**
     * Resumen de rango, progreso y comisiones efectivas de un cliente.
     */
    public Map<String, Object> resumen(String usuarioId) {
        Usuario usuario = usuarioService.obtenerObligatorio(usuarioId);
        NivelUsuario nivel = usuario.getNivel();
        NivelUsuario siguiente = nivel.siguiente();
        LocalDateTime ahora = LocalDateTime.now();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("puntos", usuario.getPuntosAcumulados());
        r.put("nivel", nivel.name());
        r.put("siguienteNivel", siguiente == null ? null : siguiente.name());
        r.put("puntosParaSiguiente", siguiente == null ? 0 : Math.max(0, nivel.puntosParaAscender() - usuario.getPuntosAcumulados()));
        r.put("descuentoNivelTransferencia", nivel.descuentoComisionTransferencia());
        r.put("bonoPuntosNivel", nivel.bonoPuntos());
        r.put("comisionTransferenciaEfectiva", politicaComisiones.tasaTransferencia(usuario, ahora));
        r.put("comisionRetiroEfectiva", politicaComisiones.tasaRetiro(usuario, ahora));
        r.put("posicionRanking", context.getArbolFidelizacion().posicionRanking(usuarioId));
        return r;
    }

    public List<BeneficioCanjeado> activos(String usuarioId) {
        usuarioService.obtenerObligatorio(usuarioId);
        return sistemaRecompensas.beneficiosActivos(usuarioId).stream()
                .filter(b -> b.getTipo() != TipoBeneficio.BONO_SALDO)
                .toList();
    }

    private Billetera elegirBilletera(String usuarioId, String billeteraId) {
        if (billeteraId != null && !billeteraId.isBlank()) {
            Billetera b = billeteraService.obtenerObligatoria(billeteraId);
            if (!usuarioId.equals(b.getUsuarioId())) {
                throw new IllegalArgumentException("La billetera no pertenece al usuario");
            }
            billeteraService.validarOperable(billeteraId);
            return b;
        }
        return billeteraService.listarPorUsuario(usuarioId).stream()
                .filter(b -> b.getEstado() == EstadoBilletera.ACTIVA)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Necesitas una billetera activa para recibir el bono"));
    }
}
