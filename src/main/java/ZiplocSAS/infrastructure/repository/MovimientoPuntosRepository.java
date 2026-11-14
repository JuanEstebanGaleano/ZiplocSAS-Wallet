package ZiplocSAS.infrastructure.repository;

import ZiplocSAS.domain.model.MovimientoPuntos;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Repositorio MongoDB del historial de puntos.
 */
public interface MovimientoPuntosRepository extends MongoRepository<MovimientoPuntos, String> {
    List<MovimientoPuntos> findByUsuarioIdOrderByFechaAsc(String usuarioId);
}
