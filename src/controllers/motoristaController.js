const { filtroTexto } = require('./helpers');

function criarMotoristaController(motoristaService) {
  return {
    cadastrar(req, res) {
      const motorista = motoristaService.cadastrar(req.body ?? {});
      res.status(201).json(motorista);
    },

    listar(req, res) {
      const motoristas = motoristaService.listar({
        nome: filtroTexto(req.query.nome),
      });
      res.json(motoristas);
    },

    buscarPorId(req, res) {
      res.json(motoristaService.buscarPorId(req.params.id));
    },

    atualizar(req, res) {
      res.json(motoristaService.atualizar(req.params.id, req.body ?? {}));
    },

    excluir(req, res) {
      motoristaService.excluir(req.params.id);
      res.status(204).send();
    },
  };
}

module.exports = criarMotoristaController;
