const request = require('supertest');
const { criarApp } = require('../../src/app');

describe('Rotas /automoveis', () => {
  let app;
  const dados = { placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' };

  beforeEach(() => {
    app = criarApp();
  });

  async function cadastrar(automovel = dados) {
    const res = await request(app).post('/automoveis').send(automovel);
    return res.body;
  }

  describe('POST /automoveis', () => {
    it('cadastra um automóvel e devolve 201', async () => {
      const res = await request(app).post('/automoveis').send(dados);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), ...dados });
    });

    it('devolve 400 quando faltam campos obrigatórios', async () => {
      const res = await request(app).post('/automoveis').send({ placa: 'ABC1D23' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: expect.stringContaining('"cor"') });
    });

    it('devolve 409 quando a placa já está cadastrada', async () => {
      await cadastrar();

      const res = await request(app).post('/automoveis').send(dados);

      expect(res.status).toBe(409);
      expect(res.body.erro).toMatch(/placa ABC1D23/);
    });

    it('devolve 400 quando o corpo não é um JSON válido', async () => {
      const res = await request(app)
        .post('/automoveis')
        .set('Content-Type', 'application/json')
        .send('{"placa": ');

      expect(res.status).toBe(400);
      expect(res.body.erro).toMatch(/JSON/);
    });
  });

  describe('GET /automoveis', () => {
    beforeEach(async () => {
      await cadastrar({ placa: 'AAA1111', cor: 'Preto', marca: 'Toyota' });
      await cadastrar({ placa: 'BBB2222', cor: 'Branco', marca: 'Toyota' });
      await cadastrar({ placa: 'CCC3333', cor: 'Preto', marca: 'Honda' });
    });

    it('lista todos os automóveis', async () => {
      const res = await request(app).get('/automoveis');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('filtra por cor', async () => {
      const res = await request(app).get('/automoveis').query({ cor: 'preto' });

      expect(res.body.map((a) => a.placa)).toEqual(['AAA1111', 'CCC3333']);
    });

    it('filtra por marca', async () => {
      const res = await request(app).get('/automoveis').query({ marca: 'Honda' });

      expect(res.body.map((a) => a.placa)).toEqual(['CCC3333']);
    });

    it('filtra por cor e marca combinadas', async () => {
      const res = await request(app).get('/automoveis').query({ cor: 'Preto', marca: 'Toyota' });

      expect(res.body.map((a) => a.placa)).toEqual(['AAA1111']);
    });
  });

  describe('GET /automoveis/:id', () => {
    it('devolve o automóvel pelo id', async () => {
      const criado = await cadastrar();

      const res = await request(app).get(`/automoveis/${criado.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(criado);
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).get('/automoveis/inexistente');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Automóvel não encontrado.' });
    });
  });

  describe('PUT /automoveis/:id', () => {
    it('atualiza os campos enviados', async () => {
      const criado = await cadastrar();

      const res = await request(app).put(`/automoveis/${criado.id}`).send({ cor: 'Azul' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...criado, cor: 'Azul' });
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).put('/automoveis/inexistente').send({ cor: 'Azul' });

      expect(res.status).toBe(404);
    });

    it('devolve 400 quando nenhum campo válido é enviado', async () => {
      const criado = await cadastrar();

      const res = await request(app).put(`/automoveis/${criado.id}`).send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /automoveis/:id', () => {
    it('exclui o automóvel e devolve 204', async () => {
      const criado = await cadastrar();

      const res = await request(app).delete(`/automoveis/${criado.id}`);

      expect(res.status).toBe(204);
      expect((await request(app).get(`/automoveis/${criado.id}`)).status).toBe(404);
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).delete('/automoveis/inexistente');

      expect(res.status).toBe(404);
    });
  });

  it('devolve 404 em JSON para rotas desconhecidas', async () => {
    const res = await request(app).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.erro).toMatch(/não encontrada/);
  });
});
