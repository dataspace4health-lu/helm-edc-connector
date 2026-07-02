timestamp ?= $(shell date "+%Y.%m.%d-%H.%M.%S")
# playwright container name
name ?= "playwright"
# playwright docker network (use k3d-ds4h to access cluster services)
network ?= k3d-ds4h
# Get the ingress IP dynamically from the cluster
ingress_ip := $(shell kubectl get ingress edc-dashboard -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "172.18.0.2")
dashboard_host ?= $(shell sed -n 's|^DASHBOARD_BASE_URL=https://\([^/]*\).*|\1|p' tests/.env)
management_host ?= $(shell sed -n 's|^MANAGEMENT_API_URL=https://\([^/]*\).*|\1|p' tests/.env)
test_hosts ?= $(shell printf '%s\n%s\n' '$(dashboard_host)' '$(management_host)' | awk 'NF && !seen[$$0]++ { printf "%s ", $$0 }')
# configure core dns - add configured test hosts pointing to the ingress IP
dns_cmd ?= docker exec $(name) bash -c "for host in $(test_hosts); do echo '$(ingress_ip) ' \$$host >> /etc/hosts; done"
# -f filename
override_values ?= 

#function to update helm dependencies and package the chart and save the tgz in helm directory
define build =
helm dependency update > /dev/null 2>&1
rm -f helm/*.tgz
helm package . -d helm
endef

define test =
mkdir -p tests/results/${timestamp}
docker run -d -t --name $(name) --network $(network) --ipc=host mcr.microsoft.com/playwright:v1.57.0-jammy
$(dns_cmd)
docker exec $(name) bash -c "mkdir -p app/tests"
docker cp tests $(name):/app
-docker exec $(name) bash -c "cd /app/tests && export CI=1 && npm i --silent && npx -y playwright test --output ./results"
if [ $$? -eq 0 ]; then \
	docker cp $(name):/app/tests/results/ tests/results/${timestamp}/traces; \
	docker cp $(name):/app/tests/playwright-report/ tests/results/${timestamp}/report; \
fi
docker rm -f $(name)
endef

SUBDIRS := $(wildcard components/*/.)
CURRENT_DIR := edc

.PHONY: all build $(SUBDIRS) install test uninstall clean

all: build install test uninstall clean

refresh: uninstall clean build install

build: $(SUBDIRS) helm/*.tgz
helm/*.tgz:
	$(build)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)

install:
ifeq ($(strip $(NAMESPACE)),)
	$(eval NAMESPACE := default)
	@echo "NAMESPACE is not set, using default. Usage: make install NAMESPACE=$(NAMESPACE)"
endif

	@echo "Installing on namespace $(NAMESPACE)"
#Ensure the namespace exists (ignore error if it already exists)
	kubectl create namespace $(NAMESPACE) 2> /dev/null || true
#Install or upgrade Helm release into the namespace with Vault values
	helm install $(CURRENT_DIR) helm/*.tgz \
		--namespace $(NAMESPACE) \
		-f vault-values.yaml \
		--set dataplane.config.dataplaneSelectorUrl=http://$(CURRENT_DIR)-controlplane:8093/edc/cp/control/api/v1/dataplanes \
		--set dataplane.config.controlplaneReadinessUrl=http://$(CURRENT_DIR)-controlplane:8181/edc/cp/base/api/check/health \
		$(override_values)

test:
	$(test)

uninstall:
ifeq ($(strip $(NAMESPACE)),)
	$(eval NAMESPACE := default)
	@echo "NAMESPACE is not set, using default. Usage: make uninstall NAMESPACE=$(NAMESPACE)"
endif
	docker rm -f $(name) 2> /dev/null || true

	@echo "Uninstalling on namespace $(NAMESPACE)"
	helm uninstall $(CURRENT_DIR) --namespace $(NAMESPACE) 2> /dev/null || true
	kubectl delete pvc data-edc-controlplane-postgresql-0 -n $(NAMESPACE) 2> /dev/null || true
	kubectl delete pvc data-edc-identityhub-postgresql-0 -n $(NAMESPACE) 2> /dev/null || true
	kubectl delete pvc data-edc-keycloak-postgresql-0 -n $(NAMESPACE) 2> /dev/null || true
	kubectl delete namespace $(NAMESPACE) --wait=true --timeout=60s 2> /dev/null || true

clean: $(SUBDIRS)
	@if [ "$(SUBDIR)" != "test" ]; then \
    	rm -rf charts helm; \
	fi

# TODO: modify makefile to build and push docker image to the registry and maintain versioning
# TAG ?= latest
# IMAGE=$(IMAGE_REPO):$(TAG)

# build:
# 	docker build -t $(IMAGE) .

# push:
# 	docker push $(IMAGE)

# install:
# 	helm upgrade --install myservice ./charts/myservice \
# 		--set image.repository=$(IMAGE_REPO) \
# 		--set image.tag=$(TAG)
