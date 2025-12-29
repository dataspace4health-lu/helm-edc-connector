timestamp = $(shell date "+%Y.%m.%d-%H.%M.%S")

#function to update helm dependencies and package the chart and save the tgz in helm directory
# NOTE: Helm dependency management for multi-chart deployments
# When working with Helm charts that contain subcharts (like dataplane depending on controlplane),
# Helm does NOT automatically traverse and build dependencies in subcharts.
# 
# IMPORTANT: You must explicitly build and update dependencies in the controlplane chart
# BEFORE packaging it and vendoring it as a dependency into the dataplane chart.
# 
# This ensures all transitive dependencies are properly resolved and included in the
# final packaged chart, preventing build failures and missing dependencies at deployment time.
define build =
cd ../controlplane && helm dependency update && cd ../dataplane
helm dependency update
helm package . -d helm
endef

#TODO: add test scripts 

SUBDIRS := $(wildcard components/*/.)
CURRENT_DIR := $(notdir $(shell pwd))

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
#Install or upgrade Helm release into the namespace
	helm install $(CURRENT_DIR) helm/*.tgz --namespace $(NAMESPACE)

uninstall:
ifeq ($(strip $(NAMESPACE)),)
	$(eval NAMESPACE := default)
	@echo "NAMESPACE is not set, using default. Usage: make uninstall NAMESPACE=$(NAMESPACE)"
endif

	@echo "Uninstalling on namespace $(NAMESPACE)"
	helm uninstall $(CURRENT_DIR) --namespace $(NAMESPACE) 2> /dev/null || true
	kubectl delete pvc data-dataplane-controlplane-postgresql-0 -n $(NAMESPACE) 2> /dev/null || true
	kubectl delete namespace $(NAMESPACE) --wait=true --timeout=60s 2> /dev/null || true

clean: $(SUBDIRS)
	cd ../controlplane && rm -rf charts helm && cd ../dataplane
	rm -rf charts helm