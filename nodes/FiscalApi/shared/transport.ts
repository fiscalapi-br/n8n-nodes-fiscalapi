import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
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
 * Reads the access key and the A1 certificate shared by the XML requests. The
 * certificate can come from a binary property of the input item or from a
 * Base64 string.
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
		chave: accessKey,
		certificado: certificate,
		senha: context.getNodeParameter('certificatePassword') as string,
	};
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
