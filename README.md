# n8n-nodes-fiscalapi

This is an n8n community node. It lets you use [FiscalAPI](https://fiscalapi.com.br) in your n8n workflows.

FiscalAPI is a Brazilian REST API for tax and registration lookups: state registrations (Inscrição Estadual) in all 27 states, company data by CNPJ, tax clearance certificates, NF-e and CT-e XML and NFS-e by access key, NF-e monitoring by access key with webhook notices, outbound DIFAL per destination state, Simples Nacional status and rural property records (SIGEF and CNIR).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Receiving NF-e Monitor notices](#receiving-nf-e-monitor-notices)
- [Example workflows](#example-workflows)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-fiscalapi`.

## Operations

| Resource | Operation | Endpoint |
|---|---|---|
| State Registration | Get by State | `GET /api/consultar` |
| State Registration | Get in All States | `GET /api/consultar-ie-todos` |
| Company | Get (by CNPJ) | `GET /api/consultar-cnpj` |
| Certificate | Get State CND | `GET /api/consultar-cnd` |
| Certificate | Get State CND in All States | `GET /api/consultar-cnd-todos` |
| Certificate | Get Federal CND | `GET /api/consultar-cnd-federal` |
| Certificate | Get CNDT (Labor Debts) | `GET /api/consultar-cndt` |
| Certificate | Get FGTS CRF | `GET /api/consultar-crf-fgts` |
| Certificate | Get All Certificates | `GET /api/certidoes-todas` |
| CTe | Get XML | `POST /api/consultar-cte-xml` |
| DIFAL | Get Outbound DIFAL (beta) | `POST /api/consultar-difal-saida` |
| NFe | Get XML | `POST /api/consultar-nfe-xml` |
| NFe Monitor | Add Keys | `POST /api/monitor-nfe/chaves` |
| NFe Monitor | Remove Keys | `POST /api/monitor-nfe/chaves/remover` |
| NFe Monitor | Get Many | `GET /api/monitor-nfe/chaves` |
| NFe Monitor | Get | `GET /api/monitor-nfe/chaves/{chave}` |
| NFS-e | Get (by access key) | `GET /api/consultar-nfse` |
| Simples Nacional | Get (by CNPJ) | `GET /api/consultar-simples-nacional` |
| Rural Property | Get SIGEF Parcels | `GET /api/consultar-sigef` |
| Rural Property | Get SIGEF Parcel (by UUID) | `GET /api/consultar-sigef-parcela` |
| Rural Property | Get CNIR Properties | `GET /api/consultar-cnir` |
| Producer Profile | Get | `GET /api/perfil-produtor` |

Each operation returns the JSON response of the API as one item (NFe Monitor → Get Many returns one item per monitored key). The node can also be used as a tool by AI agents.

## Credentials

1. Create an account at [app.fiscalapi.com.br](https://app.fiscalapi.com.br) and copy your API key from the dashboard.
2. In n8n, create a **FiscalAPI API** credential and paste the key. The key is sent in the `X-API-Key` header.
3. **10 free queries per month, in the dashboard and through the API**: state registration in one state (Get by State) and Company (Get), for accounts that never had a plan, with a confirmed email and no top-up. They do not cover "Get in All States" or live CNPJ lookups. After that you need a plan or credits: the API returns HTTP `402`. Without a key it returns `403` (`API_KEY_ERROR`). See [plans and limits](https://docs.fiscalapi.com.br/docs/referencia/plans-and-limits).

Testing the credential calls a free endpoint and does not consume credits.

## Compatibility

Built with `@n8n/node-cli` and n8n nodes API version 1. Targets n8n 1.x and later. No runtime dependencies.

## Usage

- **Documents.** Choose the document type (CPF, CNPJ or, for state registrations, the IE number) and type the number. Punctuation is accepted.
- **Source status.** A successful response may include `source_status.status` other than `success` (for example `timeout` when a government service did not answer in time). Check this field before concluding that a document has no record. In "Get in All States", `complete: false` means at least one state failed.
- **Certificates.** `result.status` is one of `negativa`, `positiva`, `positiva_com_efeitos_de_negativa`, `nao_contribuinte`, `sem_certidao` or `erro`. When available, the certificate PDF comes in `result.pdf_base64`. Use the **Convert to File** node to turn it into a file.
- **NF-e XML.** Requires the A1 certificate (.pfx/.p12) of a party to the invoice (issuer, recipient, carrier or authorized party) and its password. Load the certificate with **Read/Write Files from Disk** or an HTTP download and keep the default *Binary Property* source, or paste it as Base64. The certificate is not stored by FiscalAPI. You are only charged when the XML is returned.
- **Outbound DIFAL (beta).** Requires the A1 certificate of the **issuer** of the invoices and its password, plus the month (`YYYY-MM`). Leave *Destination States* empty to check all 10 covered states (AC, AP, DF, GO, MS, MT, RR, RS, SC, SE). Each state comes in `ufs[]` with a `status`: only `ok` is charged (one query per state). Only `paga` settles a note: `sem_guia_no_portal`, `pendente_pagamento` and `geracao_rejeitada` add up to `valor_em_aberto`, except in DF, GO and MT, where the slip is issued in the state tax system and a `sem_guia_no_portal` note adds up to `valor_a_conferir` (the state comes with a `mensagem` explaining it). Payment slips issued outside the portal (ERP, Portal GNRE) do not show up. `completo: false` means at least one state did not come back complete. See the [documentation](https://docs.fiscalapi.com.br/docs/difal/consultar-difal-saida).
- **NFe Monitor.** FiscalAPI follows each NF-e at SEFAZ for up to 180 days and sends a signed webhook notice when the note is cancelled, denied or gets an event (correction letter, for example). No certificate needed. *Add Keys* takes up to 1,000 keys per call (comma, space or new line separated); each accepted key is charged once, already monitored and invalid keys (`situacao: invalida`, with `motivo`) are not charged; without enough balance for all of them the API returns `402` and no key is added. The webhook URL itself (and its secret) is set once through the API: `PUT /api/monitor-nfe/webhook` (see [Receiving NF-e Monitor notices](#receiving-nf-e-monitor-notices)).
- **Long queries.** NF-e and SIGEF queries can take up to 3 minutes. The node waits up to 200 seconds.
- **Errors.** `402` means the free monthly queries, the plan or the credits ran out. `429` means the per-minute limit of your plan was reached; enable **Retry On Fail** in the node settings to retry automatically.

## Receiving NF-e Monitor notices

Notices arrive as an HTTP POST with JSON. Use n8n's built-in **Webhook** node to receive them:

1. Register the webhook once with the API (the response brings the `segredo`, shown only once; keep it):
   ```bash
   curl -X PUT https://api.fiscalapi.com.br/api/monitor-nfe/webhook \
     -H "X-API-Key: $FISCALAPI_API_KEY" -H "Content-Type: application/json" \
     -d '{"url": "https://your-n8n.example.com/webhook/fiscalapi-nfe"}'
   ```
   The URL must be `https` on port 443 with a public host name (n8n Cloud and a self-hosted n8n behind HTTPS both work). `POST /api/monitor-nfe/webhook/teste` sends a `tipo: teste` notice to check the flow.
2. *Webhook* node: HTTP Method `POST`, Path `fiscalapi-nfe`, and in **Options** turn on **Raw Body** (the signature covers the exact bytes received).
3. *Code* node (Run Once for All Items) right after it, to verify the signature:

   ```js
   const crypto = require('crypto');
   const secret = $env.FISCALAPI_WEBHOOK_SEGREDO; // the whsec_... secret

   const item = $input.first();
   const headers = item.json.headers;
   const raw = await this.helpers.getBinaryDataBuffer(0, 'data');
   const timestamp = String(headers['x-fiscalapi-timestamp'] ?? '');
   const signatures = String(headers['x-fiscalapi-assinatura'] ?? '')
     .split(',')
     .map((p) => p.trim())
     .filter((p) => p.startsWith('v1='))
     .map((p) => p.slice(3));

   const expected = crypto
     .createHmac('sha256', secret)
     .update(Buffer.concat([Buffer.from(`${timestamp}.`), raw]))
     .digest('hex');
   const fresh = /^\d+$/.test(timestamp) && Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300;
   const valid =
     fresh &&
     signatures.some(
       (s) => /^[0-9a-f]{64}$/i.test(s) && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)),
     );

   return [{ json: { valid, notice: valid ? JSON.parse(raw.toString('utf8')) : null } }];
   ```

4. *IF* `{{ $json.valid }}` is true → continue with `{{ $json.notice }}`. Deduplicate by `notice.id`: delivery is "at least once".

Self-hosted n8n needs `NODE_FUNCTION_ALLOW_BUILTIN=crypto` for `require('crypto')`; if `$env` access is blocked, paste the secret in the Code node instead. The signature header is `v1=` + HMAC-SHA256 (hex) of `"{timestamp}." + raw body`, keyed with the whole `whsec_...` secret; after a secret rotation it carries `v1=new,v1=old` for 24 h, which the snippet accepts. Notice types: `nfe.status_alterado` (cancellation comes here), `nfe.evento_registrado`, `nfe.monitoramento_encerrado` and `teste`. Answer within 10 seconds (the Webhook node answers right away by default).

## Example workflows

**Check a supplier before paying an invoice**

1. *Webhook* receives a CNPJ.
2. *FiscalAPI* → Company → Get.
3. *FiscalAPI* → Certificate → Get All Certificates.
4. *IF* every certificate (`certidoes_federais[].result.status` and `cnd_estaduais.results[].result.status`) is `negativa`, `positiva_com_efeitos_de_negativa` or (for state CNDs) `nao_contribuinte` → continue the payment flow; otherwise notify the finance team.

**Download NF-e XML files from a spreadsheet of access keys**

1. *Read/Write Files from Disk* reads `certificate.pfx` into the `data` binary property.
2. *Google Sheets* (or *Spreadsheet File*) returns one item per access key.
3. *Merge* combines the certificate with each item.
4. *FiscalAPI* → NFe → Get XML, Access Key `{{ $json.chave }}`.
5. *Convert to File* saves `{{ $json.resultados[0].xml }}` as `{{ $json.resultados[0].chave }}.xml`.

**Watch for cancelled NF-e from a spreadsheet**

1. *Google Sheets* returns the access keys of the notes you received.
2. *Aggregate* joins the `chave` column into one list.
3. *FiscalAPI* → NFe Monitor → Add Keys, Access Keys `{{ $json.chave }}`.
4. A second workflow receives the notices (see above) and alerts the purchasing team when `notice.status_atual` is `cancelada`.

**Find the state registrations of a rural producer**

1. *Manual Trigger* with a CPF.
2. *FiscalAPI* → State Registration → Get in All States.
3. *Split Out* `results`, then *Split Out* `results` again to get one item per registration.

## Resources

- [FiscalAPI documentation](https://docs.fiscalapi.com.br)
- [Guides](https://docs.fiscalapi.com.br/docs/guias) (n8n, Make, Power Automate, Excel, Google Sheets, Python, Node.js, PHP)
- [OpenAPI specification](https://docs.fiscalapi.com.br/openapi.json)
- [MCP server](https://github.com/fiscalapi-br/fiscalapi-mcp)
- [FiscalAPI for developers](https://fiscalapi.com.br/desenvolvedores/)
- [Authentication](https://docs.fiscalapi.com.br/docs/getting-started/authentication)
- [Error handling](https://docs.fiscalapi.com.br/docs/referencia/error-handling)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
