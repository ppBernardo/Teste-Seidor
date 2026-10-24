const { NotFoundError, BusinessRuleError, ValidationError } = require('../errors/AppError');
const { textoObrigatorio, dataValida } = require('../utils/validacoes');

/**
 * Uma utilização está "em andamento" enquanto não tiver data de término.
 */
function emAndamento(utilizacao) {
  return utilizacao.dataTermino === null;
}

class UtilizacaoService {
  /**
   * @param {object} deps
   * @param {import('../repositories/InMemoryRepository')} deps.utilizacaoRepository
   * @param {import('../repositories/InMemoryRepository')} deps.motoristaRepository
   * @param {import('../repositories/InMemoryRepository')} deps.automovelRepository
   */
  constructor({ utilizacaoRepository, motoristaRepository, automovelRepository }) {
    this.utilizacaoRepository = utilizacaoRepository;
    this.motoristaRepository = motoristaRepository;
    this.automovelRepository = automovelRepository;
  }

  /**
   * Registra o início da utilização de um automóvel por um motorista.
   *
   * Regras de negócio:
   *  - um automóvel só pode ser utilizado por um motorista por vez;
   *  - um motorista que já esteja utilizando um automóvel não pode
   *    utilizar outro ao mesmo tempo.
   *
   * Se `dataInicio` não for informada, assume o momento atual.
   */
  iniciar({ motoristaId, automovelId, dataInicio, motivo } = {}) {
    const motorista = this.obterMotorista(textoObrigatorio(motoristaId, 'motoristaId'));
    const automovel = this.obterAutomovel(textoObrigatorio(automovelId, 'automovelId'));
    const motivoValidado = textoObrigatorio(motivo, 'motivo');
    const inicio = dataInicio === undefined ? new Date() : dataValida(dataInicio, 'dataInicio');

    if (this.automovelEstaEmUso(automovel.id)) {
      throw new BusinessRuleError(
        `O automóvel de placa ${automovel.placa} já está sendo utilizado por outro motorista.`
      );
    }

    if (this.motoristaEstaEmUso(motorista.id)) {
      throw new BusinessRuleError(
        `O motorista ${motorista.nome} já está utilizando um automóvel.`
      );
    }

    const utilizacao = this.utilizacaoRepository.create({
      motoristaId: motorista.id,
      automovelId: automovel.id,
      dataInicio: inicio.toISOString(),
      dataTermino: null,
      motivo: motivoValidado,
    });

    return this.comDetalhes(utilizacao);
  }

  /**
   * Finaliza uma utilização em andamento, gravando a data de término.
   * Se `dataTermino` não for informada, assume o momento atual.
   */
  finalizar(id, { dataTermino } = {}) {
    const utilizacao = this.utilizacaoRepository.findById(id);
    if (!utilizacao) {
      throw new NotFoundError('Utilização não encontrada.');
    }

    if (!emAndamento(utilizacao)) {
      throw new BusinessRuleError('Esta utilização já foi finalizada.');
    }

    const termino = dataTermino === undefined ? new Date() : dataValida(dataTermino, 'dataTermino');

    if (termino < new Date(utilizacao.dataInicio)) {
      throw new ValidationError('A data de término não pode ser anterior à data de início.');
    }

    const atualizada = this.utilizacaoRepository.update(id, {
      dataTermino: termino.toISOString(),
    });

    return this.comDetalhes(atualizada);
  }

  buscarPorId(id) {
    const utilizacao = this.utilizacaoRepository.findById(id);
    if (!utilizacao) {
      throw new NotFoundError('Utilização não encontrada.');
    }
    return this.comDetalhes(utilizacao);
  }

  /** Lista todas as utilizações com os dados do motorista e do automóvel. */
  listar() {
    return this.utilizacaoRepository
      .findAll()
      .map((utilizacao) => this.comDetalhes(utilizacao));
  }

  obterMotorista(id) {
    const motorista = this.motoristaRepository.findById(id);
    if (!motorista) {
      throw new NotFoundError('Motorista não encontrado.');
    }
    return motorista;
  }

  obterAutomovel(id) {
    const automovel = this.automovelRepository.findById(id);
    if (!automovel) {
      throw new NotFoundError('Automóvel não encontrado.');
    }
    return automovel;
  }

  automovelEstaEmUso(automovelId) {
    return this.utilizacaoRepository
      .findAll((utilizacao) => utilizacao.automovelId === automovelId && emAndamento(utilizacao))
      .length > 0;
  }

  motoristaEstaEmUso(motoristaId) {
    return this.utilizacaoRepository
      .findAll((utilizacao) => utilizacao.motoristaId === motoristaId && emAndamento(utilizacao))
      .length > 0;
  }

  /**
   * Enriquece o registro com o nome do motorista e as informações do
   * automóvel. Caso o cadastro tenha sido removido após a utilização ter
   * sido finalizada, o campo correspondente vem como `null`.
   */
  comDetalhes(utilizacao) {
    const motorista = this.motoristaRepository.findById(utilizacao.motoristaId);
    const automovel = this.automovelRepository.findById(utilizacao.automovelId);

    return {
      id: utilizacao.id,
      dataInicio: utilizacao.dataInicio,
      dataTermino: utilizacao.dataTermino,
      motivo: utilizacao.motivo,
      motorista: motorista ? { id: motorista.id, nome: motorista.nome } : null,
      automovel: automovel
        ? { id: automovel.id, placa: automovel.placa, cor: automovel.cor, marca: automovel.marca }
        : null,
    };
  }
}

module.exports = UtilizacaoService;
