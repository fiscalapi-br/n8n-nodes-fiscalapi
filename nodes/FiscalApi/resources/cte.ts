import type { INodeProperties } from 'n8n-workflow';
import { sendCteBody } from '../shared/transport';

const resource = ['cte'];
const show = { resource, operation: ['getXml'] };

export const cteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get XML',
				value: 'getXml',
				action: 'Get the XML of a transport document by access key',
				description:
					'Get the full authorized XML of one CT-e, CT-e OS or GTV-e using the A1 certificate of a party to the document',
				routing: {
					request: { method: 'POST', url: '/api/consultar-cte-xml' },
					send: { preSend: [sendCteBody] },
				},
			},
		],
		default: 'getXml',
	},
	{
		displayName: 'Access Key',
		name: 'accessKey',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 51261011222333000181570010000001231123456784',
		description: 'CT-e access key (44 digits)',
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
		description: 'Name of the binary property that holds the A1 certificate file',
		displayOptions: { show: { ...show, certificateSource: ['binary'] } },
	},
	{
		displayName: 'Certificate (Base64)',
		name: 'certificateBase64',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'A1 certificate (.pfx/.p12) encoded in Base64',
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
