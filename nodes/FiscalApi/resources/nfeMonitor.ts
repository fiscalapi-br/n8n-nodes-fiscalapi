import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import {
	paginateMonitoredKeys,
	sendMonitorAddBody,
	sendMonitorKeyInPath,
	sendMonitorRemoveBody,
} from '../shared/transport';

const resource = ['nfeMonitor'];

const statusOptions: INodePropertyOptions[] = [
	{ name: 'Authorized', value: 'autorizada' },
	{ name: 'Authorized Out of Deadline', value: 'autorizada_fora_prazo' },
	{ name: 'Cancelled', value: 'cancelada' },
	{ name: 'Cancelled Out of Deadline', value: 'cancelada_fora_prazo' },
	{ name: 'Denied', value: 'denegada' },
	{ name: 'Key Mismatch', value: 'chave_divergente' },
	{ name: 'Not Found', value: 'nao_encontrada' },
];

export const nfeMonitorDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Add Keys',
				value: 'addKeys',
				action: 'Add invoice access keys to the monitor',
				description:
					'Start monitoring up to 1,000 NF-e keys. Each accepted key is charged once; already monitored and invalid keys are not charged.',
				routing: {
					request: { method: 'POST', url: '/api/monitor-nfe/chaves' },
					send: { preSend: [sendMonitorAddBody] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a monitored invoice',
				description: 'Get the status, events, next check and failed webhook deliveries of one monitored key',
				routing: {
					request: { method: 'GET', url: '/api/monitor-nfe/chaves' },
					send: { preSend: [sendMonitorKeyInPath] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many monitored invoices',
				description: 'Get many monitored NF-e keys, following the pagination cursor',
				routing: {
					request: { method: 'GET', url: '/api/monitor-nfe/chaves' },
					send: { paginate: true },
					operations: { pagination: paginateMonitoredKeys },
				},
			},
			{
				name: 'Remove Keys',
				value: 'removeKeys',
				action: 'Remove invoice access keys from the monitor',
				description: 'Stop monitoring up to 1,000 NF-e keys. No refund and no webhook notice.',
				routing: {
					request: { method: 'POST', url: '/api/monitor-nfe/chaves/remover' },
					send: { preSend: [sendMonitorRemoveBody] },
				},
			},
		],
		default: 'addKeys',
	},
	{
		displayName: 'Access Keys',
		name: 'accessKeys',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		placeholder: 'e.g. 35261111222333000181550010000001231123456787',
		description:
			'NF-e access keys (44 digits), separated by commas, spaces or new lines. Up to 1,000 per call. An expression returning an array also works.',
		displayOptions: { show: { resource, operation: ['addKeys', 'removeKeys'] } },
	},
	{
		displayName: 'Access Key',
		name: 'accessKey',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 35261111222333000181550010000001231123456787',
		description: 'NF-e access key (44 digits)',
		displayOptions: { show: { resource, operation: ['get'] } },
	},
	{
		displayName: 'Known Status',
		name: 'knownStatus',
		type: 'options',
		options: statusOptions,
		default: 'autorizada',
		description:
			'Status you already know for these notes. The first webhook notice is sent only if the current status is different.',
		displayOptions: { show: { resource, operation: ['addKeys'] } },
	},
	{
		displayName: 'Monitoring Days',
		name: 'monitoringDays',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 180 },
		default: 180,
		description: 'How many days to monitor each key (1 to 180). Monitoring also ends when the note is cancelled or denied.',
		displayOptions: { show: { resource, operation: ['addKeys'] } },
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
				displayName: 'Active',
				name: 'ativo',
				type: 'boolean',
				default: true,
				description: 'Whether to return only running monitors (true) or only finished ones (false)',
				routing: { send: { type: 'query', property: 'ativo' } },
			},
			{
				displayName: 'Changed Since',
				name: 'alterado_desde',
				type: 'dateTime',
				default: '',
				description:
					'Only monitors changed from this moment on. The server looks back 5 extra minutes, so items may repeat: deduplicate by key + updated time.',
				routing: { send: { type: 'query', property: 'alterado_desde' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'cancelada',
				description: 'Only notes with this status',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
