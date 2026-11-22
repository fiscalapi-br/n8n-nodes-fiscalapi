# Changelog

## 0.7.0

- New resource: NFSe Issuance (Issue, Get, Get Many with cursor pagination, Cancel, Get XML and Get PDF as binary files). The A1 certificate and the issuing company are registered once through the API; the README shows the setup and how the issuance webhook reuses the NF-e Monitor signature check.

## 0.6.0

- New resource: NFe Monitor (Add Keys, Remove Keys, Get Many with cursor pagination, Get). Webhook notices are received with n8n's Webhook node; the README shows how to verify the `X-FiscalAPI-Assinatura` signature in a Code node.

## 0.5.0

- Certificate → Get Federal CND now works for a CPF: new Date of Birth field, shown when the document type is CPF (Receita Federal requires it).

## 0.4.0

- New resource: DIFAL (Get Outbound DIFAL, beta): NF-e with DIFAL and FCP, payment slip status and open amount per destination state for one month, using the A1 certificate of the issuer.

## 0.3.0

- New resource: CTe (Get XML by access key, using the A1 certificate of a party to the document).

## 0.2.0

- New resources: NFS-e (Get by access key, optional DANFSe PDF) and Simples Nacional (Get by CNPJ).

## 0.1.0

- Initial release: State Registration, Company, Certificate, NF-e, Rural Property and Producer Profile resources.
