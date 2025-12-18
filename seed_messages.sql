-- Seed message templates
INSERT INTO message_templates (tenant_id, title, category, content, is_global)
VALUES
  (1, 'Lembrete de Sessao', 'Lembrete', 'Ola {{nome}}, sua sessao esta agendada para {{data_agendamento}} as {{hora_agendamento}}.', 0),
  (1, 'Confirmacao de Agendamento', 'Lembrete', 'Ola {{nome}}, seu agendamento foi confirmado para {{data_agendamento}} as {{hora_agendamento}}.', 0),
  (1, 'Mensagem de Aniversario', 'Aniversario', 'Parabens {{nome}}! A equipe do PsiPainel deseja um feliz aniversario.', 0),
  (1, 'Aviso Financeiro', 'Financeiro', 'Ola {{nome}}, identificamos um pagamento pendente referente a {{servico}}. Qualquer duvida, fale conosco.', 0),
  (NULL, 'Termo de Consentimento', 'Outros', 'Ola {{nome}}, segue o termo de consentimento para assinatura: {{link_documento}}.', 1)
ON DUPLICATE KEY UPDATE
  title=VALUES(title),
  category=VALUES(category),
  content=VALUES(content),
  is_global=VALUES(is_global);
