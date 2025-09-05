# Introduction 
The helm defines the control plane(an EDC connector component).

# Getting Started
Endpoints available
    To add an asset - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/assets/
    To get all assets - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/assets/request
    To add a polic - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/contractdefinitions/
    To get all policies - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/policydefinitions/request
    To add a contract definition - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/contractdefinitions/
    To get all contract definitions - POST http://dataspace4health.local/edc-cp/api/v1/management/v3/contractdefinitions/request

# Build and Test
1.	Build and push images as listed-
    1.1  Repo for the code base - **edc-controlplane**
2.	Run **make refresh** on the component level to install controlplane helm.

# Contribute
Author : Aastha Rai