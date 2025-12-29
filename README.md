# EDC Connector Helm Chart

## Introduction 
This Helm chart defines a complete Eclipse Dataspace Connector (EDC) deployment which includes multiple components:
- **Control Plane**: Core component managing contracts, assets, and policies
- **Data Plane**: Handles actual data transfer operations
- **Identity Hub**: Provides identity management and verifiable credential services
- **Dashboard**: Provides Dashboard UI for EDC instance of a participant
- **Vault**: HashiCorp Vault for secrets management (included as dependency)

The chart is designed to deploy all components as a unified connector solution for participating in data spaces.

## Key Feature: Vault as Chart Dependency

Vault is included as a **conditional dependency**, allowing you to:
- ✅ Install everything together with one command
- ✅ Skip Vault if it's already deployed elsewhere
- ✅ Preserve Vault when upgrading/removing EDC components
- ✅ Enable/disable any component independently


## Architecture

The EDC Connector consists of three main components that work together:

1. **Control Plane**: Manages metadata, contracts, policies, and negotiations
2. **Data Plane**: Handles secure data transfers between participants
3. **Identity Hub**: Provides decentralized identity and credential services
4. **Dashboard**: Provides Dashboard UI for EDC instance of a participant

Each component can be configured separately through the corresponding values files.

## Prerequisites

- Kubernetes 1.16+
- Helm 3.1.0+
- Docker registry accessible to your Kubernetes cluster

## Installation

### Building Container Images

First, build and push all required container images:

```bash
# Build Control Plane
cd edc-controlplane
docker build -t <your-registry>/edc-controlplane:latest .
docker push <your-registry>/edc-controlplane:latest

# Build Data Plane
cd edc-dataplane
docker build -t <your-registry>/edc-dataplane:latest .
docker push <your-registry>/edc-dataplane:latest

# Build Identity Hub
cd edc-identityhub
docker build -t <your-registry>/edc-identityhub:latest .
docker push <your-registry>/edc-identityhub:latest

# Build Identity Hub
cd edc-identityhub
docker build -t <your-registry>/edc-dashboard:latest .
docker push <your-registry>/edc-dashboard:latest
```

### Installing the Helm Chart

```bash
# Update dependencies and install the chart
cd helm-edc-connector
make clean && make uninstall && make build && make install
```

Alternatively, you can use standard Helm commands:

```bash
helm dependency update
helm install edc-connector -n edc ./helm/edc-connector-1.0.0.tgz
```

## Component Endpoints

### Control Plane
| Operation | Endpoint |
|-----------|----------|
| Add an asset | POST http://dataspace4health.local/edc-cp/v3/assets/ |
| Get all assets | POST http://dataspace4health.local/edc-cp/v3/assets/request |
| Add a policy | POST http://dataspace4health.local/edc-cp/v3/policydefinitions/ |
| Get all policies | POST http://dataspace4health.local/edc-cp/v3/policydefinitions/request |
| Add a contract definition | POST http://dataspace4health.local/edc-cp/v3/contractdefinitions/ |
| Get all contract definitions | POST http://dataspace4health.local/edc-cp/v3/contractdefinitions/request |
| Initiate negotiation | POST http://dataspace4health.local/edc-cp/v3/contractnegotiations |
| Get negotiation status | POST http://dataspace4health.local/edc-cp/v3/contractnegotiations/request |

### Data Plane
Registers itself to the Control Plane for data transfer purposes. The Data Plane handles secure data transfers as orchestrated by the Control Plane.

### Identity Hub
| Service | Endpoint |
|---------|----------|
| Identity API | http://dataspace4health.local/identity/ |
| Credentials API | http://dataspace4health.local/credentials/ |
| DID Resolution | http://dataspace4health.local/did/ |

### Dashboard
| Service | Endpoint |
|---------|----------|
| UI | http://dataspace4health.local/dashbaord/ |

## Configuration

Each component can be configured separately through their respective values files:
- `values.yaml`: Root chart values
- `vault-values.yaml`: Vault-specific configuration (server mode, resources, storage, etc.)
- `components/controlplane/values.yaml`: Control Plane configuration
- `components/dataplane/values.yaml`: Data Plane configuration
- `components/identityhub/values.yaml`: Identity Hub configuration
- `components/dashboard/values.yaml`: Dashboard configuration, set the connector values to change the instance of a participant

### Vault Configuration

The Vault dependency is configured through two files:
1. **values.yaml**: Controls whether Vault is enabled (`vault.enabled: true/false`)
2. **vault-values.yaml**: Contains detailed Vault configuration including:
   - Server mode (dev/standalone/HA)
   - Resource limits
   - Storage configuration
   - Service settings
   - UI configuration

The `vault-values.yaml` file is automatically applied during installation via the Makefile. To customize Vault settings, edit this file before running `make install`.

## Database Configuration

All three components (Control Plane, Data Plane, and Identity Hub) use the same PostgreSQL database

## Contribute
Improvements and contributions are welcome. When contributing:
- Use values.yaml for configuration instead of hardcoding values
- Follow the established pattern for services and deployments
- Update documentation when adding new features
- Run tests before submitting pull requests

## Authors
- Aastha Rai - Initial implementation
- Contributors: [Zied Zaafouri]