const express = require('express');

const InMemoryRepository = require('./repositories/InMemoryRepository');
const AutomovelService = require('./services/AutomovelService');
const MotoristaService = require('./services/MotoristaService');
const UtilizacaoService = require('./services/UtilizacaoService');
const criarAutomovelController = require('./controllers/automovelController');
const criarMotoristaController = require('./controllers/motoristaController');
const criarUtilizacaoController = require('./controllers/utilizacaoController');
const criarAutomoveisRouter = require('./routes/automoveisRouter');
const criarMotoristasRouter = require('./routes/motoristasRouter');
const criarUtilizacoesRouter = require('./routes/utilizacoesRouter');
const { errorHandler, rotaNaoEncontrada } = require('./middlewares/errorHandler');

/**
 * Monta a aplicação Express com todas as dependências.
 *
 * É uma função (e não um singleton) para que cada teste possa criar uma
 * instância com estado em memória limpo, sem interferência entre testes.
 */
function criarApp() {
  // Persistência em memória: um repositório por recurso.
  const automovelRepository = new InMemoryRepository();
  const motoristaRepository = new InMemoryRepository();
  const utilizacaoRepository = new InMemoryRepository();

  const automovelService = new AutomovelService({ automovelRepository, utilizacaoRepository });
  const motoristaService = new MotoristaService({ motoristaRepository, utilizacaoRepository });
  const utilizacaoService = new UtilizacaoService({
    utilizacaoRepository,
    motoristaRepository,
    automovelRepository,
  });

  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      nome: 'API de Controle de Utilização de Automóveis',
      recursos: ['/automoveis', '/motoristas', '/utilizacoes'],
    });
  });

  app.use('/automoveis', criarAutomoveisRouter(criarAutomovelController(automovelService)));
  app.use('/motoristas', criarMotoristasRouter(criarMotoristaController(motoristaService)));
  app.use('/utilizacoes', criarUtilizacoesRouter(criarUtilizacaoController(utilizacaoService)));

  app.use(rotaNaoEncontrada);
  app.use(errorHandler);

  return app;
}

module.exports = { criarApp };
