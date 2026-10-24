const { NotFoundError, BusinessRuleError } = require('../errors/AppError');
const {
  textoObrigatorio,
  camposTextoParaAtualizar,
  textoContem,
} = require('../utils/validacoes');

const CAMPOS_MOTORISTA = ['nome'];

class MotoristaService {
  /**
   * @param {object} deps
   * @param {import('../repositories/InMemoryRepository')} deps.motoristaRepository
   * @param {import('../repositories/InMemoryRepository')} deps.utilizacaoRepository
   *        usado apenas para impedir a exclusão de um motorista com utilização ativa
   */
  constructor({ motoristaRepository, utilizacaoRepository }) {
    this.motoristaRepository = motoristaRepository;
    this.utilizacaoRepository = utilizacaoRepository;
  }

  cadastrar({ nome } = {}) {
    return this.motoristaRepository.create({
      nome: textoObrigatorio(nome, 'nome'),
    });
  }

  buscarPorId(id) {
    const motorista = this.motoristaRepository.findById(id);
    if (!motorista) {
      throw new NotFoundError('Motorista não encontrado.');
    }
    return motorista;
  }

  /**
   * Lista os motoristas, filtrando opcionalmente por nome.
   * O filtro aceita trechos do nome e ignora maiúsculas/minúsculas.
   */
  listar({ nome } = {}) {
    return this.motoristaRepository.findAll(
      (motorista) => !nome || textoContem(motorista.nome, nome)
    );
  }

  atualizar(id, dados = {}) {
    this.buscarPorId(id);
    const alteracoes = camposTextoParaAtualizar(dados, CAMPOS_MOTORISTA);
    return this.motoristaRepository.update(id, alteracoes);
  }

  excluir(id) {
    this.buscarPorId(id);

    const emUso = this.utilizacaoRepository.findAll(
      (utilizacao) => utilizacao.motoristaId === id && utilizacao.dataTermino === null
    );
    if (emUso.length > 0) {
      throw new BusinessRuleError(
        'Não é possível excluir um motorista que está utilizando um automóvel. Finalize a utilização antes.'
      );
    }

    this.motoristaRepository.delete(id);
  }
}

module.exports = MotoristaService;
