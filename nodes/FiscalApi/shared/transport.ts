import {
	NodeOperationError,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

/**
 * Adds the selected document (cpf, cnpj or ie) as a query string parameter.
 */
export async function sendDocument(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const documentType = this.getNodeParameter('documentType') as string;
	const document = String(this.getNodeParameter('document') ?? '').trim();
	if (!document) {
		throw new NodeOperationError(this.getNode(), 'The document number is required');
	}
	requestOptions.qs = { ...((requestOptions.qs as IDataObject) ?? {}), [documentType]: document };
	return requestOptions;
}

/**
 * Reads the A1 certificate and its password. The certificate can come from a
 * binary property of the input item or from a Base64 string.
 */
async function readCertificate(
	context: IExecuteSingleFunctions,
): Promise<{ certificado: string; senha: string }> {
	const source = context.getNodeParameter('certificateSource') as string;
	let certificate: string;
	if (source === 'binary') {
		const binaryPropertyName = context.getNodeParameter('binaryPropertyName') as string;
		context.helpers.assertBinaryData(binaryPropertyName);
		const buffer = await context.helpers.getBinaryDataBuffer(binaryPropertyName);
		certificate = buffer.toString('base64');
	} else {
		certificate = String(context.getNodeParameter('certificateBase64') ?? '').replace(/\s+/g, '');
	}
	if (!certificate) {
		throw new NodeOperationError(context.getNode(), 'The A1 certificate is required');
	}

	return {
		certificado: certificate,
		senha: context.getNodeParameter('certificatePassword') as string,
	};
}

/**
 * Reads the access key and the A1 certificate shared by the XML requests.
 */
async function readKeyAndCertificate(
	context: IExecuteSingleFunctions,
	alphanumericKey = false,
): Promise<{ chave: string; certificado: string; senha: string }> {
	const rawKey = String(context.getNodeParameter('accessKey') ?? '');
	// CT-e keys may carry an alphanumeric CNPJ; NF-e keys are digits only.
	const accessKey = alphanumericKey
		? rawKey.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
		: rawKey.replace(/\D/g, '');
	if (accessKey.length !== 44) {
		throw new NodeOperationError(
			context.getNode(),
			alphanumericKey
				? 'The access key must have 44 characters'
				: 'The access key must have 44 digits',
		);
	}

	return { chave: accessKey, ...(await readCertificate(context)) };
}

/**
 * Builds the JSON body of the NF-e XML request.
 */
export async function sendNfeBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = {
		...(await readKeyAndCertificate(this)),
		manifestar: this.getNodeParameter('manifest', true) as boolean,
	};
	return requestOptions;
}

/**
 * Builds the JSON body of the CT-e XML request (no acknowledgment option).
 */
export async function sendCteBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = await readKeyAndCertificate(this, true);
	return requestOptions;
}

/**
 * Builds the JSON body of the outbound DIFAL request: the issuer's A1
 * certificate, the month (YYYY-MM) and, optionally, the destination states.
 */
export async function sendDifalBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const competence = String(this.getNodeParameter('competence') ?? '').trim();
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
		throw new NodeOperationError(this.getNode(), 'The month must be in the YYYY-MM format', {
			description: 'Example: 2026-10',
		});
	}
	const states = (this.getNodeParameter('states', []) as string[]) ?? [];
	const body: IDataObject = { ...(await readCertificate(this)), competencia: competence };
	if (states.length > 0) {
		body.ufs = states;
	}
	requestOptions.body = body;
	return requestOptions;
}

const MONITOR_MAX_KEYS = 1000;

/**
 * Reads the list of NF-e keys of the monitor: a string with keys separated by
 * commas, spaces or new lines, or an array (from an expression).
 */
function readMonitorKeys(context: IExecuteSingleFunctions): string[] {
	const raw = context.getNodeParameter('accessKeys') as unknown;
	const parts = Array.isArray(raw) ? raw.map((k) => String(k)) : String(raw ?? '').split(/[\s,;]+/);
	const keys = parts.map((k) => k.replace(/\D/g, '')).filter((k) => k.length > 0);
	if (keys.length === 0) {
		throw new NodeOperationError(context.getNode(), 'At least one access key is required');
	}
	if (keys.length > MONITOR_MAX_KEYS) {
		throw new NodeOperationError(
			context.getNode(),
			`Send at most ${MONITOR_MAX_KEYS} access keys per call`,
			{ description: 'Split the list with the Loop Over Items node' },
		);
	}
	return keys;
}

/**
 * Builds the JSON body of the monitor registration: the keys, the status the
 * user already knows and the monitoring period in days.
 */
export async function sendMonitorAddBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const knownStatus = this.getNodeParameter('knownStatus', 'autorizada') as string;
	const days = Number(this.getNodeParameter('monitoringDays', 180));
	if (!Number.isInteger(days) || days < 1 || days > 180) {
		throw new NodeOperationError(this.getNode(), 'Monitoring Days must be a whole number from 1 to 180');
	}
	requestOptions.body = {
		chaves: readMonitorKeys(this).map((chave) => ({ chave, status_conhecido: knownStatus })),
		prazo_dias: days,
	};
	return requestOptions;
}

/**
 * Builds the JSON body of the monitor removal.
 */
export async function sendMonitorRemoveBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = { chaves: readMonitorKeys(this) };
	return requestOptions;
}

/**
 * Appends the access key to the URL of the monitored key detail.
 */
export async function sendMonitorKeyInPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const accessKey = String(this.getNodeParameter('accessKey') ?? '').replace(/\D/g, '');
	if (accessKey.length !== 44) {
		throw new NodeOperationError(this.getNode(), 'The access key must have 44 digits');
	}
	requestOptions.url = `${requestOptions.url}/${accessKey}`;
	return requestOptions;
}

/**
 * Follows `proximo_cursor` of the monitor listing and returns one item per
 * monitored key, up to the limit (or all of them with Return All).
 */
export async function paginateMonitoredKeys(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = returnAll ? Infinity : Number(this.getNodeParameter('limit', 50));
	const items: INodeExecutionData[] = [];
	const baseQs = { ...((requestData.options.qs as IDataObject) ?? {}) };
	let cursor: string | undefined;
	do {
		const pageSize = Math.min(MONITOR_MAX_KEYS, Math.max(1, limit - items.length));
		requestData.options.qs = { ...baseQs, limite: pageSize, ...(cursor ? { cursor } : {}) };
		const [page] = await this.makeRoutingRequest(requestData);
		const body = (page?.json ?? {}) as IDataObject;
		for (const item of (body.itens as IDataObject[] | undefined) ?? []) {
			if (items.length >= limit) break;
			items.push({ json: item });
		}
		cursor = typeof body.proximo_cursor === 'string' && body.proximo_cursor ? body.proximo_cursor : undefined;
	} while (cursor && items.length < limit);
	return items;
}
