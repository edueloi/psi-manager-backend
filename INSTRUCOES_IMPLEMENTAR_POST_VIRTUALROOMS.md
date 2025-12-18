# Implementação da Rota POST /virtualRooms

## Problema
Ao tentar criar uma sala virtual pelo frontend, ocorre erro 404 (Not Found) na rota:

    POST http://localhost:3013/virtualRooms

## O que precisa ser feito

1. **Criar a rota POST /virtualRooms** no backend (`psi-manager-backend`).
2. A rota deve receber um JSON com os campos:
   - `code` (string)
   - `title` (string)
   - `description` (string)
3. A rota deve criar uma nova sala virtual no banco de dados e retornar os dados da sala criada.
4. Proteger a rota com autenticação, se necessário (token JWT).

## Exemplo de implementação (Node.js/Express)

No arquivo `routes/virtualRooms.js`:

```js
const express = require('express');
const router = express.Router();
// const auth = require('../middleware/auth'); // descomente se usar autenticação
const db = require('../db');

// router.post('/', auth, async (req, res) => {
router.post('/', async (req, res) => {
  const { code, title, description } = req.body;
  if (!code || !title) {
    return res.status(400).json({ error: 'code e title são obrigatórios' });
  }
  try {
    // Exemplo: ajuste para seu banco
    const result = await db.query(
      'INSERT INTO virtual_rooms (code, title, description) VALUES (?, ?, ?) RETURNING *',
      [code, title, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar sala virtual', details: err.message });
  }
});

module.exports = router;
```

No arquivo `server.js`, certifique-se de que a rota está registrada:

```js
const virtualRoomsRouter = require('./routes/virtualRooms');
app.use('/virtualRooms', virtualRoomsRouter);
```

## Teste com curl

```sh
curl -X POST http://localhost:3013/virtualRooms \
  -H 'Content-Type: application/json' \
  -d '{"code":"jawgo4vez","title":"Sala Instantânea - 17/12/2025","description":"Criada via atalho de acesso rápido."}'
```

## Observações
- Ajuste a query SQL conforme seu banco de dados.
- Se usar autenticação, descomente o middleware `auth`.
- Certifique-se de que o arquivo `virtualRooms.js` está na pasta `routes` e está sendo importado no `server.js`.
