const { Router } = require('express');

function criarMotoristasRouter(controller) {
  const router = Router();

  router.post('/', controller.cadastrar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  router.put('/:id', controller.atualizar);
  router.delete('/:id', controller.excluir);

  return router;
}

module.exports = criarMotoristasRouter;
