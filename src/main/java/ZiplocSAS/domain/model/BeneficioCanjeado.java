package ZiplocSAS.domain.model;

import ZiplocSAS.domain.enums.TipoBeneficio;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Beneficio canjeado por un cliente, con su ventana de vigencia.
 */
@Document(collection = "beneficios_canjeados")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficioCanjeado {
    @Id
    private String id;
    @Indexed
    private String usuarioId;
    private String beneficioId;
    private TipoBeneficio tipo;
    private String descripcion;
    private LocalDateTime fechaCanje;
    private LocalDateTime fechaExpiracion;

    /** @return {@code true} si sigue vigente en la fecha indicada. */
    public boolean vigente(LocalDateTime ahora) {
        return fechaExpiracion == null || fechaExpiracion.isAfter(ahora);
    }
}
