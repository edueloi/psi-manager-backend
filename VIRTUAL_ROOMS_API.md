# API de Salas Virtuais

Todas as rotas exigem autenticação (token JWT no header Authorization).

## Listar salas virtuais
- **GET** `/virtualRooms`
- Retorna todas as salas virtuais do tenant do usuário logado.
- Exemplo de resposta:
```json
[
  {
    "id": 1,
    "tenant_id": 1,
    "creator_user_id": 2,
    "code": "abc123xyz",
    "title": "Reunião de Equipe",
    "description": "Discussão semanal",
    "scheduled_start": "2025-12-18T14:00:00Z",
    "scheduled_end": "2025-12-18T15:00:00Z",
    "created_at": "2025-12-17T10:00:00Z",
    "updated_at": "2025-12-17T10:00:00Z"
  }
]
```

## Buscar sala virtual por ID
- **GET** `/virtualRooms/:id`
- Retorna os dados da sala virtual com o ID informado (se pertencer ao tenant).

## Criar sala virtual
- **POST** `/virtualRooms`
- Body (JSON):
```json
{
  "code": "abc123xyz",
  "title": "Reunião de Equipe",
  "description": "Discussão semanal",
  "scheduled_start": "2025-12-18T14:00:00Z",
  "scheduled_end": "2025-12-18T15:00:00Z"
}
```
- Resposta:
```json
{ "message": "Sala virtual criada", "id": 1 }
```

## Atualizar sala virtual
- **PUT** `/virtualRooms/:id`
- Body igual ao POST
- Resposta:
```json
{ "message": "Sala virtual atualizada" }
```

## Remover sala virtual
- **DELETE** `/virtualRooms/:id`
- Resposta:
```json
{ "message": "Sala virtual removida" }
```

## Observações
- O campo obrigatório é `code` (identificador único da sala).
- Os campos `title`, `description`, `scheduled_start`, `scheduled_end` são opcionais.
- O campo `creator_user_id` é preenchido automaticamente pelo backend.
- Só é possível acessar/alterar/remover salas do próprio tenant.
