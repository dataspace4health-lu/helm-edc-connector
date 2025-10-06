# EDC Identity Hub Component

This Helm chart deploys the Eclipse Dataspace Connector (EDC) Identity Hub component, which is responsible for identity management, credential handling, and DID resolution in the EDC ecosystem.

## Prerequisites

- Kubernetes 1.16+
- Helm 3.1.0+
- PostgreSQL database (provided as a dependency if enabled)

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of Identity Hub replicas to deploy | `1` |
| `image.repository` | Image repository | `ds4h-registry:5432` |
| `image.name` | Image name | `edc-identityhub` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `Always` |
| `extraVars` | Extra environment variables for the deployment | See values.yaml |
| `postgresql.enabled` | Enable PostgreSQL deployment | `true` |
| `postgresql.auth.username` | PostgreSQL username | `identityhub_user` |
| `postgresql.auth.password` | PostgreSQL password | `p@ssw0rd` |
| `postgresql.auth.database` | PostgreSQL database name | `identityhub_db` |

## Installation

```bash
helm install identityhub -f values.yaml .
```