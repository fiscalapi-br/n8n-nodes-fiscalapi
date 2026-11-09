import type { INodeProperties } from 'n8n-workflow';

const resource = ['nfse'];

export const nfseDescription: INodeProperties[] = [
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
				action: 'Get a service invoice by access key',
				description: 'Get a national-standard NFS-e by access key, no certificate needed',
				routing: {
					request: { method: 'GET', url: '/api/consultar-nfse' },
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'Access Key',
		name: 'chave',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 35503082211222333000181000000000012326100000045676',
		description: 'NFS-e access key (50 digits)',
		displayOptions: { show: { resource, operation: ['get'] } },
		routing: {
			send: { type: 'query', property: 'chave' },
		},
	},
	{
		displayName: 'Include DANFSe PDF',
		name: 'danfse',
		type: 'boolean',
		default: false,
		description: 'Whether to include the DANFSe PDF in Base64 in the response',
		displayOptions: { show: { resource, operation: ['get'] } },
		routing: {
			send: { type: 'query', property: 'danfse' },
		},
	},
];
