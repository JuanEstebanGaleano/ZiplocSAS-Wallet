package ZiplocSAS.domain.model;

import ZiplocSAS.domain.enums.TipoMovimientoPuntos;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Entrada del historial de puntos de un cliente (ganados, revertidos o canjeados).
 */
@Document(collection = "movimientos_puntos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoPuntos {
    @Id
    private String id;
    @Indexed
    private String usuarioId;
    private LocalDateTime fecha;
    /** Puntos con signo: positivo suma, negativo resta. */
    private int puntos;
    private TipoMovimientoPuntos tipo;
    private String transaccionId;
    private String descripcion;
    private int saldoResultante;
}
