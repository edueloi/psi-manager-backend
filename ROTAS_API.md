# API - Rotas Disponíveis

Este documento lista todas as rotas REST disponíveis no backend, com exemplos e observações para o front-end implementar corretamente.

---

## Pacientes (`/patients`)
Veja o arquivo PACIENTES_API.md para detalhes completos.

---

## Usuários (`/users`)
- **GET** `/users` — Lista todos os usuários do tenant (admin)
- **GET** `/users/:id` — Detalha um usuário
- **POST** `/users` — Cria usuário (admin)
- **PUT** `/users/:id` — Atualiza usuário
- **DELETE** `/users/:id` — Remove usuário

---

## Tenants (`/tenants`)
- **POST** `/tenants` — Cria tenant (super_admin)
- **GET** `/tenants` — Lista tenants (super_admin)
- **GET** `/tenants/:id` — Detalha tenant
- **PUT** `/tenants/:id` — Atualiza tenant
- **PATCH** `/tenants/:id` — Atualização parcial
- **PATCH** `/tenants/:id/admin-password` — Reset senha admin
- **DELETE** `/tenants/:id` — Remove tenant

---

## Agendamentos (`/appointments`)
- **GET** `/appointments` — Listar agendamentos

---

## Formulários (`/forms`)
- **GET** `/forms` — Listar formulários

---

## Prontuários (`/medicalRecords`)
- **GET** `/medicalRecords` — Listar prontuários

---

## Pacotes (`/packages`)
- **GET** `/packages` — Listar pacotes

---

## Pagamentos (`/payments`)
- **GET** `/payments` — Listar pagamentos

---

## Serviços (`/services`)
- **GET** `/services` — Listar serviços

---

## Sessões (`/sessions`)
- **GET** `/sessions` — Listar sessões

---

## Salas Virtuais (`/virtualRooms`)
- **GET** `/virtualRooms` — Listar salas virtuais

---

## Observações Gerais
- Todas as rotas exigem autenticação (token JWT no header Authorization).
- Para rotas de criação/atualização, envie os campos conforme exemplos dos arquivos de cada recurso.
- Para detalhes de cada rota (campos, exemplos, respostas), consulte o arquivo específico do recurso (ex: PACIENTES_API.md).
