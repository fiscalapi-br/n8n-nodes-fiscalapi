import type { INodeProperties } from 'n8n-workflow';
import { sendDifalBody } from '../shared/transport';

const resource = ['difal'];
const show = { resource, operation: ['getOutbound'] };

const STATES = ['AC', 'AP', 'DF', 'GO', 'MS', 'MT', 'RR', 'RS', 'SC', 'SE'];

export const difalDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get Outbound DIFAL',
				value: 'getOutbound',
				action: 'Get outbound DIFAL by destination state',
				description:
					'Beta. List the NF-e of one month with DIFAL and FCP, the status of each payment slip and the open amount per destination state, using the A1 certificate of the issuer.',
				routing: {
					request: { method: 'POST', url: '/api/consultar-difal-saida' },
					send: { preSend: [sendDifalBody] },
				},
			},
		],
		default: 'getOutbound',
	},
	{
		displayName: 'Month',
		name: 'competence',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 2026-10',
		description: 'Month the invoices were issued, in the YYYY-MM format. Future months are rejected.',
		displayOptions: { show },
	},
	{
		displayName: 'Destination States',
		name: 'states',
		type: 'multiOptions',
		options: STATES.map((uf) => ({ name: uf, value: uf })),
		default: [],
		description:
			'Destination states to check. Leave empty to check all 10. Each state with a complete answer is charged as one query.',
		displayOptions: { show },
	},
	{
		displayName: 'Certificate Source',
		name: 'certificateSource',
		type: 'options',
		options: [
			{
				name: 'Base64 String',
				value: 'base64',
				description: 'Paste the .pfx/.p12 file encoded in Base64',
			},
			{
				name: 'Binary Property',
				value: 'binary',
				description: 'Read the .pfx/.p12 file from a binary property of the input item',
			},
		],
		default: 'binary',
		displayOptions: { show },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the binary property that holds the A1 certificate file of the issuer',
		displayOptions: { show: { ...show, certificateSource: ['binary'] } },
	},
	{
		displayName: 'Certificate (Base64)',
		name: 'certificateBase64',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'A1 certificate (.pfx/.p12) of the issuer, encoded in Base64',
		displayOptions: { show: { ...show, certificateSource: ['base64'] } },
	},
	{
		displayName: 'Certificate Password',
		name: 'certificatePassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Password of the A1 certificate. The certificate is not stored by FiscalAPI.',
		displayOptions: { show },
	},
];
