timestamp = $(shell date "+%Y.%m.%d-%H.%M.%S")

#function to update helm dependencies and package the chart and save the tgz in helm directory
define build =
helm dependency update
helm package . -d helm
endef

SUBDIRS := $(wildcard components/*/.)
CURRENT_DIR := edc

.PHONY: all build $(SUBDIRS) install test uninstall clean

all: build install uninstall clean

refresh: uninstall clean build install

build: $(SUBDIRS) helm/*.tgz
helm/*.tgz:
	$(build)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)

install:
#Ensure the namespace exists (ignore error if it already exists)
	kubectl create namespace edc 2> /dev/null || true
#Install or upgrade Helm release into the namespace
	helm install $(CURRENT_DIR) helm/*.tgz --namespace edc


uninstall:
	helm uninstall $(CURRENT_DIR) --namespace edc 2> /dev/null || true
	kubectl delete pvc data-edc-postgresql-0  -n edc 2> /dev/null || true

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
