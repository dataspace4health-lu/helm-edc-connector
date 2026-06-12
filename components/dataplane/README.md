# Introduction
This chart deploys the EDC dataplane component and wires it to the control plane, database, ingress, and Vault settings used by the runtime.

# Vault and S3 credential handling
The dataplane runtime should only read AWS credentials from Vault through the `keyName` in an `AmazonS3` `DataAddress`. It should not create or rotate those credentials itself.

This chart therefore supports two operating modes:

1. Manual or pipeline-managed Vault seeding. Leave `config.vault.seedAwsSecret.enabled=false` and create the Vault entry outside Helm.
2. Optional Helm bootstrap hook. Set `config.vault.seedAwsSecret.enabled=true` and Helm will run a short-lived Job after install or upgrade to write a Vault KV v2 entry whose `content` field contains the serialized EDC secret token JSON.

The hook can work in three modes:

1. Chart-managed Kubernetes Secret: set `credentials.secret.create=true` and provide the inline values. The chart creates a Kubernetes Secret and the hook reads from it.
2. Existing Kubernetes Secret: set `credentials.secret.name` and the hook reads from that Secret.
3. Direct inline fallback: leave `credentials.secret.create=false` and `credentials.secret.name` empty, and the hook reads the inline values directly.

The hook is intended as a deployment convenience for local, dev, or controlled bootstrap scenarios. For production, manual seeding or external secret automation is still the cleaner pattern.

# Required Vault secret format
EDC's Hashicorp Vault integration reads the secret value from the Vault `content` field. For an AWS-backed `keyName`, the stored value must be JSON similar to:

```json
{"edctype":"dataspaceconnector:secrettoken","accessKeyId":"AKIA...","secretAccessKey":"...","sessionToken":"...","expiration":1735689600}
```

If your asset uses `"keyName": "aws-cred"`, the hook writes that token JSON to the Vault path `secret/aws-cred` by default.

# Hook configuration
The feature is disabled by default.

```yaml
config:
    vault:
        url: http://dataplane-vault:8200
        tokenSecretName: edc-controlplane-vault
        tokenSecretKey: token
        seedAwsSecret:
            enabled: true
            kvMountPath: secret
            keyName: aws-cred
            credentials:
                secret:
                    create: false
                    name: aws-s3-credentials
                    accessKeyIdKey: accessKeyId
                    secretAccessKeyKey: secretAccessKey
                    sessionTokenKey: sessionToken
                    expirationKey: expiration
```

When enabled, the hook accepts credentials from either:

1. `credentials.secret.create=true` plus `credentials.inline.*`, which lets the chart create the Kubernetes Secret for you.
2. `credentials.secret.name`, which is preferred when you already manage a Kubernetes Secret separately.
3. `credentials.inline.*`, which remains available as a direct dev-only fallback.

If you set `credentials.secret.create=false` and provide `credentials.secret.name`, Helm now fails during template rendering if that Kubernetes Secret does not exist in the release namespace.

Example for chart-managed Kubernetes Secret creation:

```yaml
config:
    vault:
        seedAwsSecret:
            enabled: true
            keyName: aws-cred
            credentials:
                secret:
                    create: true
                    name: aws-s3-credentials
                inline:
                    accessKeyId: AKIA...
                    secretAccessKey: ...
                    sessionToken: ""
                    expiration: ""
```

If `enabled=true` and you do not provide either a secret configuration or inline `accessKeyId` plus `secretAccessKey`, template rendering fails. Template rendering also fails when `credentials.secret.name` points to a missing Kubernetes Secret.

# Manual mode
If you keep the hook disabled, create the Vault secret during deployment by other means. For a Vault KV v2 mount named `secret`, the equivalent manual command is:

```bash
vault kv put secret/aws-cred content='{"edctype":"dataspaceconnector:secrettoken","accessKeyId":"AKIA...","secretAccessKey":"..."}'
```

That manual mode is usually the better production posture because credential provisioning remains outside the dataplane chart lifecycle.

# Build and test
1. Build and push the `edc-dataplane` image.
2. Run `make refresh` in this component directory to render and install the chart.

# Notes
- The `keyName` in the asset `DataAddress` must match `config.vault.seedAwsSecret.keyName` or the manually created Vault alias.
- `objectName` in the `AmazonS3` `DataAddress` must be the S3 object key, not a full HTTPS URL.
- The AWS principal stored in Vault must have `s3:GetObject` permission on the target object ARN.