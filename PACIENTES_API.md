# API de Pacientes

Todas as rotas exigem autenticação (token JWT no header Authorization).

## Listar pacientes
- **GET** `/patients`
- Retorna todos os pacientes do tenant do usuário logado.
- Exemplo de resposta:
```json
[
  {
    "id": 1,
    "tenant_id": 1,
    "full_name": "Maria Silva",
    ...
  }
]
```

## Buscar paciente por ID
- **GET** `/patients/:id`
- Retorna os dados do paciente com o ID informado (se pertencer ao tenant).
- Exemplo de resposta:
```json
{
  "id": 1,
  "tenant_id": 1,
  "full_name": "Maria Silva",
  ...
}
```

## Criar paciente
- **POST** `/patients`
- Body (JSON):
```json
{
  "full_name": "Maria Silva",
  "email": "maria@email.com",
  "whatsapp": "11999999999",
  "cpf_cnpj": "12345678900",
  ...
}
```
- Campos aceitos: full_name (ou name/fullName), email, whatsapp (ou phone), cpf_cnpj, street, house_number, neighborhood, city, state, country, nationality, naturality, marital_status, education, profession, family_contact, has_children, children_count, minor_children_count, spouse_name, convenio, convenio_name, needs_reimbursement, status
- Resposta:
```json
{ "message": "Paciente criado", "patient_id": 1 }
```

## Atualizar paciente
- **PUT** `/patients/:id`
- Body igual ao POST
- Resposta:
```json
{ "message": "Paciente atualizado" }
```

## Remover paciente
- **DELETE** `/patients/:id`
- Resposta:
```json
{ "message": "Paciente removido" }
```

## Observações
- O campo obrigatório é `full_name` (ou `name`/`fullName`).
- O campo `whatsapp` pode ser enviado como `phone`.
- Todos os campos extras são opcionais.
- O campo `status` padrão é "ativo".
