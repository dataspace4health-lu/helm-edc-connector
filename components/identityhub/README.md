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

## Database Configuration

The Identity Hub component uses the same PostgreSQL user in Control Plane and Data Plane components for consistency across the EDC deployment.

## Services

The Identity Hub exposes several services:

| Service | Port | Path | Description |
|---------|------|------|-------------|
| API | 8181 | /api | General API access |
| Identity | 8182 | /api/identity | Identity management |
| Credentials | 8183 | /api/credentials | Credential handling |
| DID | 8184 | / | DID resolution |

## Installation using make

```bash
# From the component directory
make uninstall
make clean
make build
make install
```
