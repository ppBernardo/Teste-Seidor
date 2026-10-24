const { NotFoundError, BusinessRuleError } = require('../errors/AppError');
const {
  textoObrigatorio,
  camposTextoParaAtualizar,
  textosIguais,
} = require('../utils/validacoes');

const CAMPOS_AUTOMOVEL = ['placa', 'cor', 'marca'];

/** Placas são guardadas sempre em maiúsculas para facilitar comparações. */
function normalizarPlaca(placa) {
  return placa.toUpperCase();
}

class AutomovelService {
  /**
   * @param {object} deps
   * @param {import('../repositories/InMemoryRepository')} deps.automovelRepository
   * @param {import('../repositories/InMemoryRepository')} deps.utilizacaoRepository
   *        usado apenas para impedir a exclusão de um automóvel em uso
   */
  constructor({ automovelRepository, utilizacaoRepository }) {
    this.automovelRepository = automovelRepository;
    this.utilizacaoRepository = utilizacaoRepository;
  }

  cadastrar({ placa, cor, marca } = {}) {
    const dados = {
      placa: normalizarPlaca(textoObrigatorio(placa, 'placa')),
      cor: textoObrigatorio(cor, 'cor'),
      marca: textoObrigatorio(marca, 'marca'),
    };

    this.garantirPlacaDisponivel(dados.placa);

    return this.automovelRepository.create(dados);
  }

  buscarPorId(id) {
    const automovel = this.automovelRepository.findById(id);
    if (!automovel) {
      throw new NotFoundError('Automóvel não encontrado.');
    }
    return automovel;
  }

  /**
   * Lista os automóveis, filtrando opcionalmente por cor e/ou marca.
   * Os filtros comparam o valor completo, ignorando maiúsculas/minúsculas.
   */
  listar({ cor, marca } = {}) {
    return this.automovelRepository.findAll((automovel) => {
      const corConfere = !cor || textosIguais(automovel.cor, cor);
      const marcaConfere = !marca || textosIguais(automovel.marca, marca);
      return corConfere && marcaConfere;
    });
  }

  /**
   * Atualização parcial: apenas os campos enviados são alterados.
   */
  atualizar(id, dados = {}) {
    this.buscarPorId(id);

    const alteracoes = camposTextoParaAtualizar(dados, CAMPOS_AUTOMOVEL);

    if (alteracoes.placa) {
      alteracoes.placa = normalizarPlaca(alteracoes.placa);
      this.garantirPlacaDisponivel(alteracoes.placa, id);
    }

    return this.automovelRepository.update(id, alteracoes);
  }

  excluir(id) {
    this.buscarPorId(id);

    const emUso = this.utilizacaoRepository.findAll(
      (utilizacao) => utilizacao.automovelId === id && utilizacao.dataTermino === null
    );
    if (emUso.length > 0) {
      throw new BusinessRuleError(
        'Não é possível excluir um automóvel que está em uso. Finalize a utilização antes.'
      );
    }

    this.automovelRepository.delete(id);
  }

  /**
   * Impede duas placas iguais no cadastro. `idIgnorado` permite que um
   * automóvel seja atualizado mantendo a própria placa.
   */
  garantirPlacaDisponivel(placa, idIgnorado = null) {
    const duplicado = this.automovelRepository.findAll(
      (automovel) => automovel.id !== idIgnorado && automovel.placa === placa
    );
    if (duplicado.length > 0) {
      throw new BusinessRuleError(`Já existe um automóvel cadastrado com a placa ${placa}.`);
    }
  }
}

module.exports = AutomovelService;
