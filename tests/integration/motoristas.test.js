const request = require('supertest');
const { criarApp } = require('../../src/app');

describe('Rotas /motoristas', () => {
  let app;

  beforeEach(() => {
    app = criarApp();
  });

  async function cadastrar(nome) {
    const res = await request(app).post('/motoristas').send({ nome });
    return res.body;
  }

  describe('POST /motoristas', () => {
    it('cadastra um motorista e devolve 201', async () => {
      const res = await request(app).post('/motoristas').send({ nome: 'Maria Silva' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), nome: 'Maria Silva' });
    });

    it('devolve 400 quando o nome não é informado', async () => {
      const res = await request(app).post('/motoristas').send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: expect.stringContaining('"nome"') });
    });
  });

  describe('GET /motoristas', () => {
    beforeEach(async () => {
      await cadastrar('Maria Silva');
      await cadastrar('João Souza');
      await cadastrar('Mariana Costa');
    });

    it('lista todos os motoristas', async () => {
      const res = await request(app).get('/motoristas');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('filtra por nome (trecho, sem diferenciar maiúsculas)', async () => {
      const res = await request(app).get('/motoristas').query({ nome: 'maria' });

      expect(res.body.map((m) => m.nome)).toEqual(['Maria Silva', 'Mariana Costa']);
    });

    it('devolve lista vazia quando ninguém confere com o filtro', async () => {
      const res = await request(app).get('/motoristas').query({ nome: 'Carlos' });

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /motoristas/:id', () => {
    it('devolve o motorista pelo id', async () => {
      const criado = await cadastrar('Maria Silva');

      const res = await request(app).get(`/motoristas/${criado.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(criado);
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).get('/motoristas/inexistente');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Motorista não encontrado.' });
    });
  });

  describe('PUT /motoristas/:id', () => {
    it('atualiza o nome', async () => {
      const criado = await cadastrar('Maria');

      const res = await request(app).put(`/motoristas/${criado.id}`).send({ nome: 'Maria Souza' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: criado.id, nome: 'Maria Souza' });
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).put('/motoristas/inexistente').send({ nome: 'X' });

      expect(res.status).toBe(404);
    });

    it('devolve 400 quando o nome é inválido', async () => {
      const criado = await cadastrar('Maria');

      const res = await request(app).put(`/motoristas/${criado.id}`).send({ nome: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /motoristas/:id', () => {
    it('exclui o motorista e devolve 204', async () => {
      const criado = await cadastrar('Maria');

      const res = await request(app).delete(`/motoristas/${criado.id}`);

      expect(res.status).toBe(204);
      expect((await request(app).get(`/motoristas/${criado.id}`)).status).toBe(404);
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).delete('/motoristas/inexistente');

      expect(res.status).toBe(404);
    });
  });
});
