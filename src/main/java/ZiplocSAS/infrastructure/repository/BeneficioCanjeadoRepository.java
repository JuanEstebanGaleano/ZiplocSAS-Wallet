package ZiplocSAS.infrastructure.repository;

import ZiplocSAS.domain.model.BeneficioCanjeado;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Repositorio MongoDB de beneficios canjeados.
 */
public interface BeneficioCanjeadoRepository extends MongoRepository<BeneficioCanjeado, String> {
    List<BeneficioCanjeado> findByUsuarioId(String usuarioId);
}
