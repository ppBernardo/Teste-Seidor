/**
 * Front-end simples, sem framework e sem etapa de build, para a API de
 * controle de utilização de automóveis. É servido pelo próprio Express,
 * por isso as chamadas usam caminhos relativos (/automoveis, /motoristas...).
 */

// ---------------------------------------------------------------------------
// Comunicação com a API
// ---------------------------------------------------------------------------

/**
 * Faz uma requisição à API e devolve o JSON da resposta.
 * Em caso de erro HTTP, lança um Error com a mensagem enviada pela API.
 */
async function api(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(caminho, opcoes);
  if (resposta.status === 204) {
    return null;
  }

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || `Erro ${resposta.status}`);
  }
  return dados;
}

// ---------------------------------------------------------------------------
// Utilitários de interface
// ---------------------------------------------------------------------------

const $ = (seletor) => document.querySelector(seletor);

/**
 * Cria um elemento DOM. Os filhos são sempre inseridos como texto ou nós,
 * nunca como HTML, o que evita injeção a partir dos dados cadastrados.
 */
function el(tag, atributos = {}, filhos = []) {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    if (chave === 'onClick') {
      elemento.addEventListener('click', valor);
    } else if (chave === 'className') {
      elemento.className = valor;
    } else {
      elemento.setAttribute(chave, valor);
    }
  }
  for (const filho of [].concat(filhos)) {
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return elemento;
}

function linhaVazia(colunas, texto) {
  return el('tr', {}, el('td', { colspan: colunas, className: 'vazio' }, texto));
}

let temporizadorMensagem;

function mostrarMensagem(texto, tipo) {
  const caixa = $('#mensagem');
  caixa.textContent = texto;
  caixa.className = `mensagem ${tipo}`;
  caixa.hidden = false;
  clearTimeout(temporizadorMensagem);
  temporizadorMensagem = setTimeout(() => {
    caixa.hidden = true;
  }, 4000);
}

/** Executa uma ação assíncrona exibindo sucesso ou o erro devolvido pela API. */
async function executar(acao, mensagemSucesso) {
  try {
    await acao();
    if (mensagemSucesso) {
      mostrarMensagem(mensagemSucesso, 'sucesso');
    }
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

/** Converte o valor de um <input type="datetime-local"> (hora local) para ISO 8601 em UTC. */
function dataLocalParaIso(valor) {
  return valor ? new Date(valor).toISOString() : undefined;
}

/** Lê os campos de um formulário, ignorando os que estão vazios. */
function dadosDoFormulario(form) {
  const dados = {};
  for (const [campo, valor] of new FormData(form)) {
    const texto = String(valor).trim();
    if (texto !== '') {
      dados[campo] = texto;
    }
  }
  return dados;
}

function descreverAutomovel(automovel) {
  return automovel ? `${automovel.placa} · ${automovel.marca} ${automovel.cor}` : '(removido)';
}

// ---------------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------------

function ativarAba(nome) {
  document.querySelectorAll('.tab').forEach((botao) => {
    botao.classList.toggle('active', botao.dataset.tab === nome);
  });
  document.querySelectorAll('.painel').forEach((painel) => {
    painel.hidden = painel.id !== `tab-${nome}`;
  });
}

document.querySelectorAll('.tab').forEach((botao) => {
  botao.addEventListener('click', () => ativarAba(botao.dataset.tab));
});

// ---------------------------------------------------------------------------
// Automóveis
// ---------------------------------------------------------------------------

const formAutomovel = $('#form-automovel');
const filtroAutomoveis = $('#filtro-automoveis');

async function carregarAutomoveis() {
  const filtros = new URLSearchParams(dadosDoFormulario(filtroAutomoveis));
  const automoveis = await api('GET', `/automoveis?${filtros}`);
  const corpo = $('#tabela-automoveis tbody');

  corpo.replaceChildren(
    ...automoveis.map((automovel) =>
      el('tr', {}, [
        el('td', {}, automovel.placa),
        el('td', {}, automovel.cor),
        el('td', {}, automovel.marca),
        el('td', { className: 'acoes' }, [
          el('button', { type: 'button', className: 'secundario', onClick: () => editarAutomovel(automovel) }, 'Editar'),
          el('button', { type: 'button', className: 'perigo', onClick: () => excluirAutomovel(automovel) }, 'Excluir'),
        ]),
      ])
    )
  );

  if (automoveis.length === 0) {
    corpo.append(linhaVazia(4, 'Nenhum automóvel encontrado.'));
  }
}

function editarAutomovel(automovel) {
  formAutomovel.elements.id.value = automovel.id;
  formAutomovel.elements.placa.value = automovel.placa;
  formAutomovel.elements.cor.value = automovel.cor;
  formAutomovel.elements.marca.value = automovel.marca;
  $('#titulo-form-automovel').textContent = `Editar automóvel ${automovel.placa}`;
  $('#cancelar-automovel').hidden = false;
  formAutomovel.elements.placa.focus();
}

function limparFormAutomovel() {
  formAutomovel.reset();
  formAutomovel.elements.id.value = '';
  $('#titulo-form-automovel').textContent = 'Cadastrar automóvel';
  $('#cancelar-automovel').hidden = true;
}

function excluirAutomovel(automovel) {
  if (!window.confirm(`Excluir o automóvel ${automovel.placa}?`)) {
    return;
  }
  executar(async () => {
    await api('DELETE', `/automoveis/${automovel.id}`);
    await atualizarTudo();
  }, 'Automóvel excluído.');
}

formAutomovel.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const { id, ...dados } = dadosDoFormulario(formAutomovel);

  executar(async () => {
    if (id) {
      await api('PUT', `/automoveis/${id}`, dados);
    } else {
      await api('POST', '/automoveis', dados);
    }
    limparFormAutomovel();
    await atualizarTudo();
  }, id ? 'Automóvel atualizado.' : 'Automóvel cadastrado.');
});

$('#cancelar-automovel').addEventListener('click', limparFormAutomovel);

filtroAutomoveis.addEventListener('submit', (evento) => {
  evento.preventDefault();
  executar(carregarAutomoveis);
});

// O evento "reset" dispara antes de os campos serem limpos; por isso o setTimeout.
filtroAutomoveis.addEventListener('reset', () => setTimeout(() => executar(carregarAutomoveis)));

// ---------------------------------------------------------------------------
// Motoristas
// ---------------------------------------------------------------------------

const formMotorista = $('#form-motorista');
const filtroMotoristas = $('#filtro-motoristas');

async function carregarMotoristas() {
  const filtros = new URLSearchParams(dadosDoFormulario(filtroMotoristas));
  const motoristas = await api('GET', `/motoristas?${filtros}`);
  const corpo = $('#tabela-motoristas tbody');

  corpo.replaceChildren(
    ...motoristas.map((motorista) =>
      el('tr', {}, [
        el('td', {}, motorista.nome),
        el('td', { className: 'acoes' }, [
          el('button', { type: 'button', className: 'secundario', onClick: () => editarMotorista(motorista) }, 'Editar'),
          el('button', { type: 'button', className: 'perigo', onClick: () => excluirMotorista(motorista) }, 'Excluir'),
        ]),
      ])
    )
  );

  if (motoristas.length === 0) {
    corpo.append(linhaVazia(2, 'Nenhum motorista encontrado.'));
  }
}

function editarMotorista(motorista) {
  formMotorista.elements.id.value = motorista.id;
  formMotorista.elements.nome.value = motorista.nome;
  $('#titulo-form-motorista').textContent = `Editar motorista ${motorista.nome}`;
  $('#cancelar-motorista').hidden = false;
  formMotorista.elements.nome.focus();
}

function limparFormMotorista() {
  formMotorista.reset();
  formMotorista.elements.id.value = '';
  $('#titulo-form-motorista').textContent = 'Cadastrar motorista';
  $('#cancelar-motorista').hidden = true;
}

function excluirMotorista(motorista) {
  if (!window.confirm(`Excluir o motorista ${motorista.nome}?`)) {
    return;
  }
  executar(async () => {
    await api('DELETE', `/motoristas/${motorista.id}`);
    await atualizarTudo();
  }, 'Motorista excluído.');
}

formMotorista.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const { id, ...dados } = dadosDoFormulario(formMotorista);

  executar(async () => {
    if (id) {
      await api('PUT', `/motoristas/${id}`, dados);
    } else {
      await api('POST', '/motoristas', dados);
    }
    limparFormMotorista();
    await atualizarTudo();
  }, id ? 'Motorista atualizado.' : 'Motorista cadastrado.');
});

$('#cancelar-motorista').addEventListener('click', limparFormMotorista);

filtroMotoristas.addEventListener('submit', (evento) => {
  evento.preventDefault();
  executar(carregarMotoristas);
});

filtroMotoristas.addEventListener('reset', () => setTimeout(() => executar(carregarMotoristas)));

// ---------------------------------------------------------------------------
// Utilizações
// ---------------------------------------------------------------------------

const formUtilizacao = $('#form-utilizacao');

/** Preenche os <select> de motorista e automóvel com todos os cadastros (sem filtros). */
async function carregarSelecoes() {
  const [motoristas, automoveis] = await Promise.all([
    api('GET', '/motoristas'),
    api('GET', '/automoveis'),
  ]);

  const selecaoMotorista = formUtilizacao.elements.motoristaId;
  const selecaoAutomovel = formUtilizacao.elements.automovelId;
  const motoristaAtual = selecaoMotorista.value;
  const automovelAtual = selecaoAutomovel.value;

  selecaoMotorista.replaceChildren(
    el('option', { value: '' }, 'Selecione um motorista'),
    ...motoristas.map((motorista) => el('option', { value: motorista.id }, motorista.nome))
  );
  selecaoAutomovel.replaceChildren(
    el('option', { value: '' }, 'Selecione um automóvel'),
    ...automoveis.map((automovel) => el('option', { value: automovel.id }, descreverAutomovel(automovel)))
  );

  // Mantém a escolha do usuário se o registro ainda existir.
  selecaoMotorista.value = motoristaAtual;
  selecaoAutomovel.value = automovelAtual;
}

async function carregarUtilizacoes() {
  const utilizacoes = await api('GET', '/utilizacoes');
  const corpo = $('#tabela-utilizacoes tbody');

  corpo.replaceChildren(
    ...utilizacoes.map((utilizacao) => {
      const emAndamento = utilizacao.dataTermino === null;
      return el('tr', { className: emAndamento ? 'ativa' : '' }, [
        el('td', {}, utilizacao.motorista ? utilizacao.motorista.nome : '(removido)'),
        el('td', {}, descreverAutomovel(utilizacao.automovel)),
        el('td', {}, formatarData(utilizacao.dataInicio)),
        el('td', {}, emAndamento
          ? el('span', { className: 'badge' }, 'Em andamento')
          : formatarData(utilizacao.dataTermino)),
        el('td', {}, utilizacao.motivo),
        el('td', { className: 'acoes' }, emAndamento
          ? [el('button', { type: 'button', onClick: () => finalizarUtilizacao(utilizacao) }, 'Finalizar')]
          : []),
      ]);
    })
  );

  if (utilizacoes.length === 0) {
    corpo.append(linhaVazia(6, 'Nenhuma utilização registrada.'));
  }
}

function finalizarUtilizacao(utilizacao) {
  const motorista = utilizacao.motorista ? utilizacao.motorista.nome : '(removido)';
  if (!window.confirm(`Finalizar a utilização de ${descreverAutomovel(utilizacao.automovel)} por ${motorista}?`)) {
    return;
  }
  executar(async () => {
    await api('PATCH', `/utilizacoes/${utilizacao.id}/finalizar`);
    await atualizarTudo();
  }, 'Utilização finalizada.');
}

formUtilizacao.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const dados = dadosDoFormulario(formUtilizacao);
  dados.dataInicio = dataLocalParaIso(dados.dataInicio);

  executar(async () => {
    await api('POST', '/utilizacoes', dados);
    formUtilizacao.reset();
    await atualizarTudo();
  }, 'Utilização iniciada.');
});

// ---------------------------------------------------------------------------
// Carga inicial
// ---------------------------------------------------------------------------

/** Recarrega todas as listas; chamado após qualquer alteração. */
async function atualizarTudo() {
  await Promise.all([
    carregarAutomoveis(),
    carregarMotoristas(),
    carregarSelecoes(),
    carregarUtilizacoes(),
  ]);
}

executar(atualizarTudo);
