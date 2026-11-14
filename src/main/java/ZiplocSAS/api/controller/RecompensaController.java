package ZiplocSAS.api.controller;

import ZiplocSAS.api.dto.ApiResponse;
import ZiplocSAS.application.service.CanjeService;
import ZiplocSAS.application.service.SistemaRecompensas;
import ZiplocSAS.application.service.UsuarioService;
import ZiplocSAS.domain.model.Beneficio;
import ZiplocSAS.domain.model.BeneficioCanjeado;
import ZiplocSAS.domain.model.MovimientoPuntos;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para puntos, rangos, beneficios y canjes.
 */
@RestController
@RequestMapping("/recompensas")
@RequiredArgsConstructor
public class RecompensaController {
    private final SistemaRecompensas sistemaRecompensas;
    private final CanjeService canjeService;
    private final UsuarioService usuarioService;

    @GetMapping("/beneficios")
    public ResponseEntity<ApiResponse<List<Beneficio>>> listarBeneficios() {
        return ResponseEntity.ok(ApiResponse.<List<Beneficio>>builder()
                .success(true)
                .data(sistemaRecompensas.listarBeneficios())
                .build());
    }

    @GetMapping("/{usuarioId}/puntos")
    public ResponseEntity<ApiResponse<Integer>> obtenerPuntos(@PathVariable String usuarioId) {
        return usuarioService.buscarPorId(usuarioId)
                .map(usuario -> ResponseEntity.ok(ApiResponse.<Integer>builder()
                        .success(true)
                        .data(usuario.getPuntosAcumulados())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{usuarioId}/nivel")
    public ResponseEntity<ApiResponse<String>> obtenerNivel(@PathVariable String usuarioId) {
        return usuarioService.buscarPorId(usuarioId)
                .map(usuario -> ResponseEntity.ok(ApiResponse.<String>builder()
                        .success(true)
                        .data(usuario.getNivel().name())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{usuarioId}/resumen")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resumen(@PathVariable String usuarioId) {
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .success(true)
                .data(canjeService.resumen(usuarioId))
                .build());
    }

    @GetMapping("/{usuarioId}/historial")
    public ResponseEntity<ApiResponse<List<MovimientoPuntos>>> historial(@PathVariable String usuarioId) {
        return ResponseEntity.ok(ApiResponse.<List<MovimientoPuntos>>builder()
                .success(true)
                .data(usuarioService.historialPuntos(usuarioId).reversed())
                .build());
    }

    @GetMapping("/{usuarioId}/activos")
    public ResponseEntity<ApiResponse<List<BeneficioCanjeado>>> activos(@PathVariable String usuarioId) {
        return ResponseEntity.ok(ApiResponse.<List<BeneficioCanjeado>>builder()
                .success(true)
                .data(canjeService.activos(usuarioId))
                .build());
    }

    /**
     * Canjea puntos por un beneficio. Si no es posible responde 200 con success=false y el motivo.
     */
    @PostMapping("/{usuarioId}/canjear/{beneficioId}")
    public ResponseEntity<ApiResponse<Boolean>> canjearBeneficio(
            @PathVariable String usuarioId,
            @PathVariable String beneficioId,
            @RequestParam(required = false) String billeteraId) {
        try {
            canjeService.canjear(usuarioId, beneficioId, billeteraId);
            return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                    .success(true)
                    .message("Beneficio canjeado exitosamente")
                    .data(true)
                    .build());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                    .success(false)
                    .message(ex.getMessage())
                    .data(false)
                    .build());
        }
    }
}
