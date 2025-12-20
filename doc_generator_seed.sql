-- Seed default categories and templates (adjust tenant_id as needed)
-- Set this variable before running:
-- SET @tenant_id = 1;

INSERT INTO document_categories (tenant_id, name)
VALUES
  (@tenant_id, 'Declaracoes'),
  (@tenant_id, 'Atestados'),
  (@tenant_id, 'Recibos');

SET @cat_declaracoes := (SELECT id FROM document_categories WHERE tenant_id=@tenant_id AND name='Declaracoes' LIMIT 1);
SET @cat_atestados := (SELECT id FROM document_categories WHERE tenant_id=@tenant_id AND name='Atestados' LIMIT 1);
SET @cat_recibos := (SELECT id FROM document_categories WHERE tenant_id=@tenant_id AND name='Recibos' LIMIT 1);

INSERT INTO document_templates
  (tenant_id, category_id, title, doc_type, template_body, signature_name, signature_crp)
VALUES
  (
    @tenant_id, @cat_declaracoes, 'Declaracao de Atendimento', 'declaration',
    'DECLARACAO\n\nDeclaro que {{patient_name}} esteve em atendimento psicologico no dia {{date}} das {{time_start}} as {{time_end}}.\n\n{{city}}, {{date}}.\n\n{{professional_name}} - CRP {{professional_crp}}',
    NULL, NULL
  ),
  (
    @tenant_id, @cat_atestados, 'Atestado de Comparecimento', 'attestation',
    'ATESTADO\n\nAtesto para os devidos fins que {{patient_name}} compareceu ao atendimento psicologico no dia {{date}}.\n\n{{city}}, {{date}}.\n\n{{professional_name}} - CRP {{professional_crp}}',
    NULL, NULL
  ),
  (
    @tenant_id, @cat_recibos, 'Recibo de Sessao', 'receipt',
    'RECIBO\n\nRecebi de {{patient_name}} a quantia de {{amount}} referente a {{service_name}} realizada em {{date}}.\n\n{{professional_name}} - CRP {{professional_crp}}',
    NULL, NULL
  );
