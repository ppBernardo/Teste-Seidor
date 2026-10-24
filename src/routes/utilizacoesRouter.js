const { Router } = require('express');

function criarUtilizacoesRouter(controller) {
  const router = Router();

  router.post('/', controller.iniciar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  router.patch('/:id/finalizar', controller.finalizar);

  return router;
}

module.exports = criarUtilizacoesRouter;
