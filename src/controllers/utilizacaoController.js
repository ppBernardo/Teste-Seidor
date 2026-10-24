function criarUtilizacaoController(utilizacaoService) {
  return {
    iniciar(req, res) {
      const utilizacao = utilizacaoService.iniciar(req.body ?? {});
      res.status(201).json(utilizacao);
    },

    finalizar(req, res) {
      const utilizacao = utilizacaoService.finalizar(req.params.id, req.body ?? {});
      res.json(utilizacao);
    },

    listar(req, res) {
      res.json(utilizacaoService.listar());
    },

    buscarPorId(req, res) {
      res.json(utilizacaoService.buscarPorId(req.params.id));
    },
  };
}

module.exports = criarUtilizacaoController;
