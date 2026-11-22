import type { INodeProperties, INodePropertyOptions, PostReceiveAction } from 'n8n-workflow';
import {
	nameIssuedNfseFile,
	paginateIssuedNfse,
	sendIssuedNfseIdInPath,
	sendNfseCancelBody,
	sendNfseIssueBody,
} from '../shared/transport';

const resource = ['nfseIssuance'];

const environmentOptions: INodePropertyOptions[] = [
	{
		name: 'Homologation (Testing)',
		value: 'homologacao',
		description: 'No tax value, free, up to 1,000 invoices a month',
	},
	{ name: 'Production', value: 'producao', description: 'Valid invoice, charged when authorized' },
];

const statusOptions: INodePropertyOptions[] = [
	{ name: 'Authorized', value: 'autorizada' },
	{ name: 'Cancelled', value: 'cancelada' },
	{ name: 'Cancelling', value: 'cancelando' },
	{ name: 'Pending', value: 'pendente' },
	{ name: 'Processing', value: 'processando' },
	{ name: 'Rejected', value: 'rejeitada' },
	{ name: 'Replaced', value: 'substituida' },
];

// Fictitious example (CNPJ with a valid check digit, not a real customer).
const invoiceDataExample = JSON.stringify(
	{
		competencia: '2026-11-22',
		tomador: { tipo: 'cnpj', documento: '12.345.678/0001-95', nome: 'Cliente Exemplo Comercio Ltda' },
		servico: {
			codigo_tributacao_nacional: '01.07.01',
			descricao: 'Suporte técnico em informática, novembro de 2026',
		},
		valores: { valor_servico: '1500.00', percentual_tributos_aproximado: '6.00' },
	},
	null,
	2,
);

const fileOperations = ['getXml', 'getPdf'];

// n8n turns the response bytes into a binary property; then the file gets its name and type.
const fileOutput: PostReceiveAction[] = [
	{
		type: 'binaryData',
		properties: { destinationProperty: '={{$parameter["binaryPropertyOutput"]}}' },
	},
	nameIssuedNfseFile,
];

export const nfseIssuanceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel an issued service invoice',
				description:
					'Ask to cancel an authorized NFS-e. The result (cancelada or cancelamento_recusado) comes by webhook or Get.',
				routing: {
					request: { method: 'POST', url: '/api/nfse/notas/{id}/cancelamento' },
					send: { preSend: [sendIssuedNfseIdInPath, sendNfseCancelBody] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an issued service invoice',
				description: 'Get the status, access key, number and errors of an issued NFS-e',
				routing: {
					request: { method: 'GET', url: '/api/nfse/notas/{id}' },
					send: { preSend: [sendIssuedNfseIdInPath] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many issued service invoices',
				description: 'Get many issued NFS-e in order of last change, following the pagination cursor',
				routing: {
					request: { method: 'GET', url: '/api/nfse/notas' },
					send: { paginate: true },
					operations: { pagination: paginateIssuedNfse },
				},
			},
			{
				name: 'Get PDF',
				value: 'getPdf',
				action: 'Get the DANFSe PDF of an issued service invoice',
				description: 'Download the DANFSe (PDF) of an authorized NFS-e as a binary file. Not charged.',
				routing: {
					request: {
						method: 'GET',
						url: '/api/nfse/notas/{id}/pdf',
						headers: { Accept: 'application/pdf' },
						encoding: 'arraybuffer',
						json: false,
						returnFullResponse: true,
					},
					send: { preSend: [sendIssuedNfseIdInPath] },
					output: { postReceive: fileOutput },
				},
			},
			{
				name: 'Get XML',
				value: 'getXml',
				action: 'Get the XML of an issued service invoice',
				description: 'Download the authorized XML of an NFS-e as a binary file. Not charged.',
				routing: {
					request: {
						method: 'GET',
						url: '/api/nfse/notas/{id}/xml',
						headers: { Accept: 'application/xml' },
						encoding: 'arraybuffer',
						json: false,
						returnFullResponse: true,
					},
					send: { preSend: [sendIssuedNfseIdInPath] },
					output: { postReceive: fileOutput },
				},
			},
			{
				name: 'Issue',
				value: 'issue',
				action: 'Issue a service invoice',
				description:
					'Issue a national-standard NFS-e with the A1 certificate of your company. Answers 202 with the invoice pending; the result comes by webhook or Get.',
				routing: {
					request: { method: 'POST', url: '/api/nfse/notas' },
					send: { preSend: [sendNfseIssueBody] },
				},
			},
		],
		default: 'issue',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 8f1c2a4e-5b6d-4e7f-9a0b-1c2d3e4f5a6b',
		description:
			'ID of the issuing company, registered once with POST /api/nfse/empresas (after the A1 certificate)',
		displayOptions: { show: { resource, operation: ['issue'] } },
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'options',
		options: environmentOptions,
		default: 'homologacao',
		description: 'Homologation runs the same rules with no tax value. Production issues a valid invoice.',
		displayOptions: { show: { resource, operation: ['issue'] } },
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		default: '',
		placeholder: 'e.g. order-1001',
		description:
			'Your ID for the invoice (order, sale), up to 50 characters. Required in production. Sending the same reference again returns the invoice that already exists.',
		displayOptions: { show: { resource, operation: ['issue'] } },
	},
	{
		displayName: 'Preset',
		name: 'preset',
		type: 'options',
		options: [
			{
				name: 'Movable Property Rental',
				value: 'locacao_bem_movel',
				description: 'Code 99.04.01, ISS not levied. Requires bens_moveis.',
			},
			{ name: 'None', value: '' },
			{
				name: 'Regular Regime Service',
				value: 'regime_normal_servico',
				description: 'Taxable ISS. Requires valores.iss.',
			},
			{
				name: 'Simples Nacional Service',
				value: 'simples_servico',
				description: 'Taxable ISS, not withheld, for Simples Nacional companies',
			},
		],
		default: 'simples_servico',
		description: 'Ready scenario that fills the fixed fields of the invoice',
		displayOptions: { show: { resource, operation: ['issue'] } },
	},
	{
		displayName: 'Invoice Data (JSON)',
		name: 'invoiceData',
		type: 'json',
		default: invoiceDataExample,
		required: true,
		description:
			'The invoice fields in the API format: competencia, tomador, servico, valores and, when needed, ibs_cbs, destinatario, bens_moveis and codigo_interno. Send amounts as text ("1500.00").',
		displayOptions: { show: { resource, operation: ['issue'] } },
	},
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 3b8e2f4a-6c1d-4e9f-8a7b-2c3d4e5f6a7b',
		description: 'The "id" returned by Issue or Get Many',
		displayOptions: { show: { resource, operation: ['get', 'cancel', ...fileOperations] } },
	},
	{
		displayName: 'Reason',
		name: 'cancelReason',
		type: 'options',
		options: [
			{ name: 'Error in Issuance', value: 1 },
			{ name: 'Other', value: 9 },
			{ name: 'Service Not Provided', value: 2 },
		],
		default: 1,
		description: 'Reason for the cancellation',
		displayOptions: { show: { resource, operation: ['cancel'] } },
	},
	{
		displayName: 'Justification',
		name: 'justification',
		type: 'string',
		default: '',
		required: true,
		description: 'Text of the reason, from 15 to 255 characters',
		displayOptions: { show: { resource, operation: ['cancel'] } },
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyOutput',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the output binary field to put the file in',
		displayOptions: { show: { resource, operation: fileOperations } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource, operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource, operation: ['getAll'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Environment',
				name: 'ambiente',
				type: 'options',
				options: environmentOptions,
				default: 'producao',
				description: 'Only invoices of this environment',
				routing: { send: { type: 'query', property: 'ambiente' } },
			},
			{
				displayName: 'Reference',
				name: 'referencia',
				type: 'string',
				default: '',
				description: 'Only the invoice with this reference',
				routing: { send: { type: 'query', property: 'referencia' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'autorizada',
				description: 'Only invoices with this status',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Updated Since',
				name: 'atualizada_desde',
				type: 'dateTime',
				default: '',
				description:
					'Only invoices changed from this moment on. The invoice of that exact moment comes again: deduplicate by ID.',
				routing: { send: { type: 'query', property: 'atualizada_desde' } },
			},
		],
	},
];
