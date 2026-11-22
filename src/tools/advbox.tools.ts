import * as z from 'zod/v4';
import { advboxService } from '../services/index.js';
import { McpTool } from '../wrappers/tool.wrapper.js';

const stringField = (description: string) => z.string().describe(description);
const integerField = (description: string) => z.number().int().describe(description);
const dateField = (description: string) =>
  stringField(`${description} (AAAA-MM-DD)`);

const pageSchema = {
  limit: integerField('Quantidade máxima de registros (1 a 1000). Padrão: 50.').min(1).max(1000).optional(),
  offset: integerField('Registros a pular, para paginar. Padrão: 0.').min(0).optional(),
};

interface AdvboxToolDefinition {
  name: string;
  description: string;
  path: string;
  schema: z.ZodType;
  defaults?: Record<string, unknown>;
  atLeastOne?: string[];
}

const definitions: AdvboxToolDefinition[] = [
  {
    name: 'configuracoes_conta',
    description: 'GET /settings - configurações da conta, usuários, origens de lead, tarefas, fases e dados financeiros.',
    path: '/settings',
    schema: z.object({}).strict(),
  },
  {
    name: 'buscar_contatos',
    description: 'GET /customers - lista contatos com filtros combinados.',
    path: '/customers',
    schema: z.object({
      name: stringField('Parte do nome do contato.'),
      identification: stringField('CPF ou CNPJ.'),
      phone: stringField('Telefone com DDD.'),
      document: stringField('Número do documento.'),
      email: stringField('E-mail.'),
      city: stringField('Cidade.'),
      state: stringField('UF, ex.: SP.'),
      occupation: stringField('Profissão.'),
      birthdays: z.boolean().optional(),
      created_start: dateField('Cadastro a partir de'),
      created_end: dateField('Cadastro até'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'obter_contato',
    description: 'GET /customers/{id} - dados completos de um contato.',
    path: '/customers/{id}',
    schema: z.object({ id: integerField('ID do contato.') }).strict(),
  },
  {
    name: 'aniversariantes',
    description: 'GET /customers/birthdays - contatos que fazem aniversário no mês.',
    path: '/customers/birthdays',
    schema: z.object({
      month: integerField('Mês de 1 a 12.').min(1).max(12).optional(),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'buscar_processos',
    description: 'GET /lawsuits - lista processos com filtros combinados.',
    path: '/lawsuits',
    schema: z.object({
      name: stringField('Parte do nome do cliente vinculado.'),
      customer_id: integerField('ID do contato vinculado.'),
      identification: stringField('CPF ou CNPJ do cliente vinculado.'),
      process_number: stringField('Número do processo.'),
      protocol_number: stringField('Número do protocolo.'),
      folder: stringField('Nome da pasta.'),
      notes: stringField('Trecho das anotações.'),
      group: stringField('Parte do grupo.'),
      type: stringField('Parte do tipo de processo.'),
      responsible: stringField('Parte do nome do responsável.'),
      stage: stringField('Parte da fase ou ID da fase.'),
      step: stringField('Parte do nome da etapa.'),
      process_date_start: dateField('Data do processo a partir de'),
      process_date_end: dateField('Data do processo até'),
      status_closure_start: dateField('Encerramento a partir de'),
      status_closure_end: dateField('Encerramento até'),
      exit_production_start: dateField('Trânsito em julgado a partir de'),
      exit_production_end: dateField('Trânsito em julgado até'),
      exit_execution_start: dateField('Arquivamento a partir de'),
      exit_execution_end: dateField('Arquivamento até'),
      created_start: dateField('Criação a partir de'),
      created_end: dateField('Criação até'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'obter_processo',
    description: 'GET /lawsuits/{id} - dados completos de um processo.',
    path: '/lawsuits/{id}',
    schema: z.object({ id: integerField('ID do processo.') }).strict(),
  },
  {
    name: 'movimentacoes_processo',
    description: 'GET /movements/{lawsuit_id} - movimentações de um processo.',
    path: '/movements/{lawsuit_id}',
    schema: z.object({
      lawsuit_id: integerField('ID do processo.'),
      origin: z.enum(['TRIBUNAL', 'MANUAL']).optional(),
    }).strict(),
  },
  {
    name: 'ultimas_movimentacoes',
    description: 'GET /last_movements - andamento mais recente de cada processo.',
    path: '/last_movements',
    schema: z.object({
      lawsuit_id: integerField('ID do processo.').optional(),
      process_number: stringField('Número do processo.'),
      protocol_number: stringField('Número do protocolo.'),
      date_start: dateField('Último andamento a partir de'),
      date_end: dateField('Último andamento até'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'historico_tarefas_processo',
    description: 'GET /history/{lawsuit_id} - histórico de tarefas de um processo.',
    path: '/history/{lawsuit_id}',
    schema: z.object({
      lawsuit_id: integerField('ID do processo.'),
      status: z.enum(['pending', 'completed', 'all']).optional(),
    }).strict(),
  },
  {
    name: 'publicacoes_processo',
    description: 'GET /publications/{lawsuit_id} - publicações vinculadas a um processo.',
    path: '/publications/{lawsuit_id}',
    schema: z.object({ lawsuit_id: integerField('ID do processo.') }).strict(),
  },
  {
    name: 'buscar_tarefas',
    description: 'GET /posts - tarefas do escritório.',
    path: '/posts',
    schema: z.object({
      date_start: dateField('Data da tarefa a partir de'),
      date_end: dateField('Data da tarefa até'),
      created_start: dateField('Criação a partir de'),
      created_end: dateField('Criação até'),
      deadline_start: dateField('Prazo a partir de'),
      deadline_end: dateField('Prazo até'),
      completed_start: dateField('Conclusão a partir de'),
      completed_end: dateField('Conclusão até'),
      user_id: stringField('ID do usuário responsável.'),
      user_name: stringField('Parte do nome do responsável.'),
      task_id: stringField('ID do tipo de tarefa.'),
      id: integerField('ID de uma tarefa específica.'),
      lawsuit_id: stringField('ID do processo.'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'buscar_transacoes',
    description: 'GET /transactions - lançamentos financeiros.',
    path: '/transactions',
    schema: z.object({
      lawsuit_id: integerField('ID do processo.'),
      category: stringField('Parte da categoria.'),
      responsible: stringField('Parte do responsável.'),
      customer_name: stringField('Parte do nome do cliente.'),
      customer_identification: stringField('CPF ou CNPJ do cliente.'),
      debit_bank: stringField('Parte do nome do banco.'),
      cost_center: stringField('Parte do centro de custo.'),
      description: stringField('Parte da descrição.'),
      process_number: stringField('Número do processo.'),
      protocol_number: stringField('Número do protocolo.'),
      created_start: dateField('Criação a partir de'),
      created_end: dateField('Criação até'),
      date_due_start: dateField('Vencimento a partir de'),
      date_due_end: dateField('Vencimento até'),
      date_payment_start: dateField('Pagamento a partir de'),
      date_payment_end: dateField('Pagamento até'),
      competence_start: stringField('Competência inicial (MM/AAAA).'),
      competence_end: stringField('Competência final (MM/AAAA).'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
  },
  {
    name: 'obter_transacao',
    description: 'GET /transactions/{id} - dados completos de um lançamento financeiro.',
    path: '/transactions/{id}',
    schema: z.object({ id: integerField('ID da transação.') }).strict(),
  },
  {
    name: 'buscar_documentos',
    description: 'GET /documents - arquivos anexados. Informe name, customer_id, transaction_id ou post_id.',
    path: '/documents',
    schema: z.object({
      name: stringField('Parte do nome do arquivo (mínimo 3 caracteres).'),
      customer_id: integerField('ID do cliente.'),
      transaction_id: integerField('ID do lançamento.'),
      post_id: integerField('ID da tarefa.'),
      ...pageSchema,
    }).partial().strict(),
    defaults: { limit: 50 },
    atLeastOne: ['name', 'customer_id', 'transaction_id', 'post_id'],
  },
  {
    name: 'link_download_documento',
    description: 'GET /documents/{id}/download - gera um link temporário de download.',
    path: '/documents/{id}/download',
    schema: z.object({ id: integerField('ID do documento.') }).strict(),
  },
];

for (const definition of definitions) {
  McpTool({
    name: definition.name,
    description: definition.description,
    schema: definition.schema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async (input, extra) => {
      const advboxApiKey = (
        extra as {
          http?: {
            authInfo?: {
              advboxApiKey?: string;
            };
          };
        } | undefined
      )?.http?.authInfo?.advboxApiKey;

      const args = {
        ...(definition.defaults ?? {}),
        ...(input as Record<string, unknown>),
      };

      if (
        definition.atLeastOne &&
        !definition.atLeastOne.some((key) => args[key] !== undefined && args[key] !== '')
      ) {
        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `Informe pelo menos um destes filtros: ${definition.atLeastOne.join(', ')}.`,
          }],
        };
      }

      if (definition.name === 'historico_tarefas_processo' && args.status === 'all') {
        delete args.status;
      }

      const result = await advboxService.get(definition.path, args, advboxApiKey);

      return {
        isError: !result.ok,
        content: [{ type: 'text' as const, text: result.text }],
      };
    },
  });
}
