# Helm EDC Connector

This chart deploys one complete EDC participant instance. After installation, the release behaves as a participant connector that can publish assets, evaluate policies, negotiate contracts, execute transfers, issue and consume credentials through IdentityHub, and expose a participant dashboard.

## Functional Overview

The Helm chart produces one participant instance by combining these runtime pieces:

| Component | Role in the participant setup |
|---|---|
| `controlplane` | Runs the participant control plane, exposes management, DSP, control, and catalog APIs, and evaluates the participant policies and scopes. |
| `dataplane` | Registers itself with the control plane and handles the actual data transfer endpoints, including the public HTTP pull endpoint. |
| `identityhub` | Owns the participant DID, exposes DID and STS endpoints, and manages identity and credential operations for the participant. |
| `dashboard` | Exposes the UI used to operate the participant instance and points it at the control plane and optional federated catalog endpoints. |
| PostgreSQL | Persists control plane and IdentityHub runtime state. Each subchart deploys its own PostgreSQL instance by default. |
| Vault | Stores or exposes the secrets and keys used by the runtimes. It can be deployed as a chart dependency or replaced with an external Vault service. |

In practice, the release is a participant connector because:

1. The control plane, dataplane, and IdentityHub are configured with the same participant identity.
2. The dataplane self-registers into the control plane.
3. IdentityHub exposes the DID Web and STS endpoints used by the participant runtime.
4. The dashboard is preconfigured to call the participant APIs on the same hostname.

## Technical Composition

The parent chart declared in `Chart.yaml` packages these dependencies:

- `controlplane` from `components/controlplane`
- `dataplane` from `components/dataplane`
- `identityhub` from `components/identityhub`
- `dashboard` from `components/dashboard`
- optional `vault` dependency

The parent `values.yaml` is mainly an orchestration layer. It wires the child charts together through:

- a shared participant DID used across control plane, dataplane, IdentityHub, and dashboard
- shared Vault token secret name and key when the runtimes use the same Vault token
- one public participant hostname and ingress routing for all exposed APIs
- release-name-sensitive internal URLs used by the dataplane to call the control plane

## What Gets Exposed

Main public endpoints for one participant host:

| Endpoint | Purpose |
|---|---|
| `POST /edc/cp/management/api/v3/assets` | Create assets in the participant control plane. |
| `POST /edc/cp/management/api/v3/policydefinitions` | Create policy definitions. |
| `POST /edc/cp/management/api/v3/contractdefinitions` | Create contract definitions. |
| `POST /edc/cp/management/api/v3/contractnegotiations` | Start contract negotiations. |
| `POST /edc/cp/dsp/api` | DSP endpoint used by counterparties. |
| `POST /edc/dp/public/api` | Public dataplane endpoint used for HTTP pull transfers. |
| `GET /.well-known` | DID Web metadata served by IdentityHub. |
| `POST /edc/ih/sts/api/token` | STS token endpoint used by the participant runtimes. |
| `GET /edc/ih/identity/api` | IdentityHub identity API. |
| `GET /edc/ih/credentials/api` | IdentityHub credentials API. |
| `GET /edc/dashboard` | Participant dashboard UI. |

Example participant host:

- `https://edc-acme.dataspace4health.local/edc/cp/management/api`
- `https://edc-acme.dataspace4health.local/edc/cp/dsp/api`
- `https://edc-acme.dataspace4health.local/edc/dp/public/api`
- `https://edc-acme.dataspace4health.local/edc/ih/sts/api/token`
- `https://edc-acme.dataspace4health.local/edc/dashboard`

## Installation

Build and install from the chart root:

```bash
cd /home/developer/EDC-repo/helm-edc-connector
make build
make install NAMESPACE=edc-acme override_values="-f participant-values.yaml"
```

Notes:

- The chart `Makefile` installs with `vault-values.yaml` by default.
- The `Makefile` also injects `dataplane.config.dataplaneSelectorUrl` and `dataplane.config.controlplaneReadinessUrl` using the release name `edc`, so using `make install` is safer than raw `helm install` unless you override those values explicitly.
- If you use an external Vault, override the parent and child chart Vault URLs and token secret references.
- The most complete working participant examples in this workspace are `integration-edc/edc-holder1.yaml` and `integration-edc/edc-user1.yaml`.

## How This Helm Setup Becomes an EDC Participant

The result is a participant because the parent chart wires the subcharts with one identity and one runtime flow.

### Identity side

The IdentityHub subchart is configured with the participant DID, signing algorithm, signing curve, DID Web endpoint, and STS endpoint.

### Control and transfer side

The control plane subchart is configured with:

- the participant DID as `config.participantId`
- the same DID as `config.issuerId`
- trusted issuer entries used during credential validation
- the internal DSP callback address used by counterparties and federators
- the STS client id, client secret alias, public key id, and private key alias

The dataplane subchart is configured with:

- the same participant DID
- a self-registration flow into the control plane
- the public transfer endpoint exposed to consumers
- the key aliases used for dataplane token verification and signing

Because those pieces point to the same identity and secret store, the release behaves as one participant connector instead of independent services.

## Minimum Values To Provide

Create a small participant override file such as `participant-values.yaml`.

Keep it focused on the identity, host, Vault, STS, and dataplane public endpoint. The rest can stay on chart defaults and be adjusted only when needed.

```yaml
controlplane:
   config:
      participantId: "did:web:edc-acme.dataspace4health.local"
      issuerId: "did:web:edc-acme.dataspace4health.local"
      dsp:
         callbackAddress: "http://edc-controlplane.edc-acme.svc.cluster.local:8092/edc/cp/dsp/api"
      sts:
         oauthTokenUrl: "http://edc-identityhub:8185/edc/ih/sts/api/token"
         oauthClientId: "did:web:edc-acme.dataspace4health.local"
         oauthClientSecretAlias: "did:web:edc-acme.dataspace4health.local-sts-client-secret"
         publicKeyId: "did:web:edc-acme.dataspace4health.local#key"
         privateKeyAlias: "did:web:edc-acme.dataspace4health.local-alias"
      vault:
         tokenSecretName: "edc-vault"
         tokenSecretKey: "token"
         url: "http://vault-acme:8200"
   ingress:
      enabled: true
      hosts:
         - host: edc-acme.dataspace4health.local

dataplane:
   config:
      participantId: "did:web:edc-acme.dataspace4health.local"
      dataplaneProxyPublicEndpoint: "https://edc-acme.dataspace4health.local/edc/dp/public/api"
      stsPrivateKeyAlias: "did:web:edc-acme.dataspace4health.local-alias"
      stsPublicKeyAlias: "did:web:edc-acme.dataspace4health.local-alias"
      vault:
         tokenSecretName: "edc-vault"
         tokenSecretKey: "token"
         url: "http://vault-acme:8200"
   ingress:
      enabled: true
      hosts:
         - host: edc-acme.dataspace4health.local

identityhub:
   config:
      participant:
         id: "did:web:edc-acme.dataspace4health.local"
         keysign:
            algo: "EdDSA"
For full working examples, use these participant overrides as the reference points:
The values below are the most important ones to understand when turning the chart into a specific participant instance.
| `controlplane.config.issuerId` | Issuer identity used when the control plane validates or emits credential-related flows. It should match the participant DID in this setup. |
|---|---|

            ## Integration Example: Minimal Participant Values

            To get started, override only the values that must be unique for your participant. Here is a minimal example based on [integration-edc/edc-holder1.yaml](../integration-edc/edc-holder1.yaml):

            ```yaml
            controlplane:
              config:
                participantId: "did:web:edc-holder1.dataspace4health.local"
                issuerId: "did:web:edc-holder1.dataspace4health.local"
                dsp:
                  callbackAddress: "http://edc-controlplane.edc-holder1.svc.cluster.local:8092/edc/cp/dsp/api"
                sts:
                  oauthTokenUrl: "http://edc-identityhub:8185/edc/ih/sts/api/token"
                  oauthClientId: "did:web:edc-holder1.dataspace4health.local"
                  oauthClientSecretAlias: "did:web:edc-holder1.dataspace4health.local-sts-client-secret"
                  publicKeyId: "did:web:edc-holder1.dataspace4health.local#key"
                  privateKeyAlias: "did:web:edc-holder1.dataspace4health.local-alias"
                vault:
                  tokenSecretName: "edc-vault"
                  tokenSecretKey: "token"
                  url: "http://vault-holder1:8200"
              ingress:
                hosts:
                  - host: edc-holder1.dataspace4health.local

| `identityhub.config.identityHubIamId` and `identityHubIamPublicKeyAlias` | IdentityHub IAM defaults used by the runtime. |
              config:
                participantId: "did:web:edc-holder1.dataspace4health.local"
                dataplaneProxyPublicEndpoint: "https://edc-holder1.dataspace4health.local/edc/dp/public/api"
                stsPrivateKeyAlias: "did:web:edc-holder1.dataspace4health.local-alias"
                stsPublicKeyAlias: "did:web:edc-holder1.dataspace4health.local-alias"
                vault:
                  tokenSecretName: "edc-vault"
                  tokenSecretKey: "token"
                  url: "http://vault-holder1:8200"
              ingress:
                hosts:
                  - host: edc-holder1.dataspace4health.local

| `identityhub.config.vault.*` | Vault connection details used by IdentityHub. |
              config:
                participant:
                  id: "did:web:edc-holder1.dataspace4health.local"
                  keysign:
                    algo: "EdDSA"
                    curve: "Ed25519"
                vault:
                  tokenSecretName: "edc-vault"
                  tokenSecretKey: "token"
                  url: "http://vault-holder1:8200"
              ingress:
                hosts:
                  - host: edc-holder1.dataspace4health.local

| `identityhub.ingress.hosts` with `/.well-known` | Exposes DID Web metadata publicly. |
              config:
                connectorName: "Data Holder 1"
                managementUrl: "https://edc-holder1.dataspace4health.local/edc/cp/management/api"
                defaultUrl: "https://edc-holder1.dataspace4health.local/edc/cp/base/api"
                protocolUrl: "https://edc-holder1.dataspace4health.local/edc/cp/dsp/api"
                did: "did:web:edc-holder1.dataspace4health.local"
              ingress:
                hosts:
                  - host: edc-holder1.dataspace4health.local

| `identityhub.ingress.hosts` with `/edc/ih/sts/api` | Exposes the STS endpoint required by the control plane. |
              enabled: true
            ```

            See the full working example in [integration-edc/edc-holder1.yaml](../integration-edc/edc-holder1.yaml) for all advanced options and a complete participant override.

            For the complete set of chart defaults, see:

            - `values.yaml`
            - `components/controlplane/values.yaml`
            - `components/dataplane/values.yaml`
            - `components/identityhub/values.yaml`
            - `components/dashboard/values.yaml`

### Dashboard values

| Value | Meaning |
|---|---|
| `dashboard.config.connectorName` | Display name shown in the dashboard UI. |
| `dashboard.config.managementUrl` | Control plane management API URL used by the UI. |
| `dashboard.config.defaultUrl` | Control plane base API URL used by the UI. |
| `dashboard.config.protocolUrl` | Participant DSP endpoint shown and used by the UI. |
| `dashboard.config.federatedCatalogEnabled` | Enables the federated catalog features in the UI. |
| `dashboard.config.federatedCatalogUrl` | Federator API URL used by the UI when federated catalog support is enabled. |
| `dashboard.config.did` | Participant DID displayed in the UI. |
| `dashboard.ingress.hosts` | Public dashboard route. |
| `dashboard.themeColors`, `logoUrl`, `logoAlt`, `fontFamily`, `footerText` | Optional branding and theming settings. |

### Vault values

| Value | Meaning |
|---|---|
| `vault.enabled` | Deploys the bundled HashiCorp Vault dependency when `true`. |
| `vault.server.dev.enabled` | Enables dev-mode Vault. Suitable for local or integration environments only. |
| `vault.server.dev.devRootToken` | Root token used by the bundled dev Vault. |
| `vault.server.dataStorage.enabled` and `size` | Persistence settings for the bundled Vault chart. |

## Minimum Configuration Checklist

Before installing, verify these values are correct for your environment:

1. Participant hostname and TLS secret.
2. Same participant DID used in control plane, dataplane, IdentityHub, and dashboard.
3. Vault URL, token secret name, and token secret key.
4. STS client id, client secret alias, public key id, and private key alias.
5. Internal DSP callback address and dataplane public endpoint.
6. Trusted issuer entries and supported credential types.
7. Dataplane selector and readiness URLs if you do not use the default `make install` flow.

## Verification After Deployment

Use these checks after installation:

1. Confirm the control plane, dataplane, IdentityHub, dashboard, PostgreSQL, and Vault pods are running.
2. Confirm `/.well-known` is reachable on the participant host.
3. Confirm `/edc/ih/sts/api/token` is reachable.
4. Confirm `/edc/cp/management/api` and `/edc/cp/dsp/api` are reachable.
5. Confirm `/edc/dp/public/api` is reachable.
6. Confirm `/edc/dashboard` loads and points to the expected participant URLs.

If the deployment is healthy but transfers fail, the first places to check are the participant DID alignment, Vault key aliases, STS settings, and dataplane public endpoint.