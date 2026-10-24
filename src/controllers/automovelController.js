const { filtroTexto } = require('./helpers');

/**
 * Controllers são propositalmente finos: traduzem a requisição HTTP em uma
 * chamada ao serviço e o resultado em resposta. Toda validação e regra de
 * negócio fica nos serviços.
 */
function criarAutomovelController(automovelService) {
  return {
    cadastrar(req, res) {
      const automovel = automovelService.cadastrar(req.body ?? {});
      res.status(201).json(automovel);
    },

    listar(req, res) {
      const automoveis = automovelService.listar({
        cor: filtroTexto(req.query.cor),
        marca: filtroTexto(req.query.marca),
      });
      res.json(automoveis);
    },

    buscarPorId(req, res) {
      res.json(automovelService.buscarPorId(req.params.id));
    },

    atualizar(req, res) {
      res.json(automovelService.atualizar(req.params.id, req.body ?? {}));
    },

    excluir(req, res) {
      automovelService.excluir(req.params.id);
      res.status(204).send();
    },
  };
}

module.exports = criarAutomovelController;
