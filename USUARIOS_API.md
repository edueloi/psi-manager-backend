# API de Profissionais (Usuários)

Todas as rotas exigem autenticação (token JWT no header Authorization).
Apenas usuários com role `admin` podem criar, editar ou remover profissionais.

## Listar profissionais
- **GET** `/users`
- Retorna todos os usuários do tenant.

## Buscar profissional por ID
- **GET** `/users/:id`
- Retorna os dados do usuário com o ID informado.

## Criar profissional
- **POST** `/users`
- Body (JSON):
```json
{
  "name": "João da Silva",
  "email": "joao@email.com",
  "password": "senha_inicial",
  "role": "profissional", // ou "admin" ou "secretario"
  "phone": "11999999999", // opcional
  "is_active": true // ou false
}
```
- Resposta:
```json
{ "message": "Usuário criado", "user_id": 1 }
```

## Atualizar profissional
- **PUT** `/users/:id`
- Body igual ao POST (pode incluir ou não o campo `password` para trocar a senha)
- Resposta:
```json
{ "message": "Usuário atualizado" }
```

## Remover profissional
- **DELETE** `/users/:id`
- Resposta:
```json
{ "message": "Usuário removido" }
```

## Observações
- O campo obrigatório para cargo é `role` ("admin", "profissional" ou "secretario" — sempre minúsculo).
- O campo `is_active` controla se o usuário está ativo ou inativo.
- O campo `password` só é obrigatório na criação, e opcional na edição.
- O backend registra o usuário logado (nome/email) em cada requisição via token JWT.
- Só o admin pode criar, editar ou remover profissionais.
