package ZiplocSAS;

import ZiplocSAS.application.service.BilleteraService;
import ZiplocSAS.application.service.CanjeService;
import ZiplocSAS.application.service.SistemaRecompensas;
import ZiplocSAS.domain.enums.TipoBeneficio;
import ZiplocSAS.application.service.OperacionProgramadaService;
import ZiplocSAS.application.service.ServicioAnalitica;
import ZiplocSAS.application.service.TransaccionService;
import ZiplocSAS.application.service.UsuarioService;
import ZiplocSAS.domain.enums.EstadoTransaccion;
import ZiplocSAS.domain.enums.NivelRiesgo;
import ZiplocSAS.domain.enums.TipoTransaccion;
import ZiplocSAS.domain.model.Billetera;
import ZiplocSAS.domain.model.OperacionProgramada;
import ZiplocSAS.domain.model.Transaccion;
import ZiplocSAS.domain.model.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "app.programadas.procesador.enabled=false")
class PlataformaWorkflowTests {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private BilleteraService billeteraService;

    @Autowired
    private TransaccionService transaccionService;

    @Autowired
    private OperacionProgramadaService operacionProgramadaService;

    @Autowired
    private ServicioAnalitica servicioAnalitica;

    @Autowired
    private SistemaRecompensas sistemaRecompensas;

    @Autowired
    private CanjeService canjeService;

    @Test
    void transferenciaAcumulaPuntosYPuedeRevertirse() {

        Usuario origen = crearUsuario("Origen Flujo");
        Usuario destino = crearUsuario("Destino Flujo");

        Billetera walletOrigen = crearBilletera(origen, 10_000);
        Billetera walletDestino = crearBilletera(destino, 0);

        Transaccion transferencia = transaccionService.crear(
                Transaccion.builder()
                        .tipo(TipoTransaccion.TRANSFERENCIA)
                        .valor(3_000)
                        .billeteraOrigenId(walletOrigen.getId())
                        .billeteraDestinoId(walletDestino.getId())
                        .build()
        );

        assertEquals(
                EstadoTransaccion.COMPLETADA,
                transferencia.getEstado()
        );

        assertEquals(60.0, transferencia.getComision(), 0.001);   // 2% base (rango Bronce)

        assertEquals(
                6_940,
                billeteraService.obtenerSaldo(walletOrigen.getId()),
                0.001
        );

        assertEquals(
                3_000,
                billeteraService.obtenerSaldo(walletDestino.getId())
        );

        assertEquals(
                90,
                usuarioService.buscarPorId(origen.getId())
                        .orElseThrow()
                        .getPuntosAcumulados()
        );

        assertTrue(
                transaccionService.revertir(transferencia.getId())
        );

        assertEquals(
                EstadoTransaccion.REVERTIDA,
                transferencia.getEstado()
        );

        assertEquals(
                10_000,
                billeteraService.obtenerSaldo(walletOrigen.getId())
        );

        assertEquals(
                0,
                billeteraService.obtenerSaldo(walletDestino.getId())
        );

        assertEquals(
                0,
                usuarioService.buscarPorId(origen.getId())
                        .orElseThrow()
                        .getPuntosAcumulados()
        );
    }

    @Test
    void operacionesProgramadasSeProcesanPorFecha() {

        Usuario origen = crearUsuario("Origen Programada");
        Usuario destino = crearUsuario("Destino Programada");

        Billetera walletOrigen = crearBilletera(origen, 20_000);
        Billetera walletDestino = crearBilletera(destino, 0);

        OperacionProgramada vencida =
                operacionProgramadaService.programar(
                        OperacionProgramada.builder()
                                .fechaEjecucion(
                                        LocalDateTime.now().minusMinutes(1)
                                )
                                .tipo(TipoTransaccion.PAGO_PROGRAMADO)
                                .valor(1_000)
                                .billeteraOrigenId(walletOrigen.getId())
                                .billeteraDestinoId(walletDestino.getId())
                                .prioridad(1)
                                .build()
                );

        OperacionProgramada futura =
                operacionProgramadaService.programar(
                        OperacionProgramada.builder()
                                .fechaEjecucion(
                                        LocalDateTime.now().plusDays(1)
                                )
                                .tipo(TipoTransaccion.PAGO_PROGRAMADO)
                                .valor(1_000)
                                .billeteraOrigenId(walletOrigen.getId())
                                .billeteraDestinoId(walletDestino.getId())
                                .prioridad(1)
                                .build()
                );

        List<OperacionProgramada> procesadas =
                operacionProgramadaService.procesarPendientes(
                        LocalDateTime.now()
                );

        // Verificar que la operación vencida fue ejecutada.
        assertTrue(
                procesadas.stream().anyMatch(
                        op -> op.getId().equals(vencida.getId())
                                && op.isEjecutada()
                ),
                "La operación vencida debe ejecutarse"
        );

        // Verificar que la operación futura sigue pendiente.
        // Verificar que la operación futura sigue pendiente.
        // Verificar que la operación futura sigue pendiente.
        assertTrue(
                operacionProgramadaService.listarPendientes(futura.getUsuarioId())
                        .stream()
                        .anyMatch(op -> op.getId().equals(futura.getId())),
                "La operación futura debe permanecer pendiente"
        );
        // Verificar el saldo después de la ejecución.
        assertEquals(
                18_980,
                billeteraService.obtenerSaldo(walletOrigen.getId()),
                0.001
        );
    }

    @Test
    void transaccionCriticaGeneraEventoDeAuditoria() {

        Usuario origen = crearUsuario("Origen Riesgo");
        Usuario destino = crearUsuario("Destino Riesgo");

        Billetera walletOrigen = crearBilletera(origen, 7_000_000);
        Billetera walletDestino = crearBilletera(destino, 0);

        Transaccion transferencia = transaccionService.crear(
                Transaccion.builder()
                        .tipo(TipoTransaccion.TRANSFERENCIA)
                        .valor(5_500_000)
                        .billeteraOrigenId(walletOrigen.getId())
                        .billeteraDestinoId(walletDestino.getId())
                        .build()
        );

        Map<String, Object> auditoria =
                servicioAnalitica.consultarAuditoria(origen.getId());

        assertEquals(
                NivelRiesgo.CRITICO,
                transferencia.getNivelRiesgo()
        );

        assertTrue(
                (Integer) auditoria.get("totalEventos") > 0
        );
    }

    @Test
    void puntosSegunEnunciadoPorTipoDeTransaccion() {
        assertEquals(1, sistemaRecompensas.calcularPuntos(TipoTransaccion.RECARGA, 199));
        assertEquals(4, sistemaRecompensas.calcularPuntos(TipoTransaccion.RETIRO, 250));
        assertEquals(9, sistemaRecompensas.calcularPuntos(TipoTransaccion.TRANSFERENCIA, 300));
    }

    @Test
    void gastoRegistraCategoriaYAlimentaElGrafoDeGastos() {
        Usuario u = crearUsuario("Gastador");
        Billetera w = crearBilletera(u, 5_000);

        transaccionService.crear(Transaccion.builder().tipo(TipoTransaccion.GASTO).valor(1_000)
                .categoriaGasto("ALIMENTACION").billeteraOrigenId(w.getId()).build());
        transaccionService.crear(Transaccion.builder().tipo(TipoTransaccion.GASTO).valor(500)
                .categoriaGasto("TRANSPORTE").billeteraOrigenId(w.getId()).build());

        Map<String, Object> gastos = servicioAnalitica.gastosUsuario(u.getId());
        assertEquals(1_500.0, (Double) gastos.get("totalGastado"), 0.001);
        assertEquals("ALIMENTACION", gastos.get("categoriaPrincipal"));
        assertEquals(3_500, billeteraService.obtenerSaldo(w.getId()), 0.001);
    }

    @Test
    void canjeDe100PuntosReduceLaComisionDeTransferencia() {
        Usuario u = crearUsuario("Canjeador");
        Usuario d = crearUsuario("Receptor");
        Billetera w = crearBilletera(u, 0);
        Billetera wd = crearBilletera(d, 0);
        transaccionService.crear(Transaccion.builder().tipo(TipoTransaccion.RECARGA).valor(20_000)
                .billeteraDestinoId(w.getId()).build());            // 200 puntos
        String beneficioId = sistemaRecompensas.listarBeneficios().stream()
                .filter(b -> b.getTipo() == TipoBeneficio.DESCUENTO_COMISION_TRANSFERENCIA)
                .findFirst().orElseThrow().getId();

        canjeService.canjear(u.getId(), beneficioId, null);

        assertEquals(100, usuarioService.buscarPorId(u.getId()).orElseThrow().getPuntosAcumulados());
        Transaccion t = transaccionService.crear(Transaccion.builder().tipo(TipoTransaccion.TRANSFERENCIA)
                .valor(1_000).billeteraOrigenId(w.getId()).billeteraDestinoId(wd.getId()).build());
        assertEquals(18.0, t.getComision(), 0.001);                  // 2% * 0.9
    }

    @Test
    void canjeSinPuntosSuficientesSeRechaza() {
        Usuario u = crearUsuario("Sin Puntos");
        String beneficioId = sistemaRecompensas.listarBeneficios().get(0).getId();
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> canjeService.canjear(u.getId(), beneficioId, null));
    }

    private Usuario crearUsuario(String nombre) {

        return usuarioService.crear(
                Usuario.builder()
                        .nombre(nombre)
                        .email(
                                nombre.toLowerCase().replace(" ", ".")
                                        + "-"
                                        + UUID.randomUUID()
                                        + "@example.com"
                        )
                        .telefono("3000000000")
                        .build(),
                "secreto123"
        );
    }

    private Billetera crearBilletera(
            Usuario usuario,
            double saldo
    ) {

        return billeteraService.crear(
                Billetera.builder()
                        .nombre("Wallet " + usuario.getNombre())
                        .saldo(saldo)
                        .usuarioId(usuario.getId())
                        .build()
        );
    }
}