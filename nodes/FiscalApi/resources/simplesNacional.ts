import type { INodeProperties } from 'n8n-workflow';

const resource = ['simplesNacional'];

export const simplesNacionalDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the simplified tax regime status of a CNPJ',
				description: 'Get the Simples Nacional and SIMEI status of a CNPJ',
				routing: {
					request: { method: 'GET', url: '/api/consultar-simples-nacional' },
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'CNPJ',
		name: 'cnpj',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 11.222.333/0001-81',
		description: 'Company tax ID. Punctuation is accepted.',
		displayOptions: { show: { resource, operation: ['get'] } },
		routing: {
			send: { type: 'query', property: 'cnpj' },
		},
	},
];
