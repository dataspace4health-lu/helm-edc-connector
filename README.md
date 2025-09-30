# Introduction 
The helm defines a connector which include multiple components like controlplane, identityhub, dataplane.

# Getting Started
Endpoints available depends on the component.
**Control Plane**
    To add an asset - POST http://dataspace4health.local/edc-cp/assets/
    To get all assets - POST http://dataspace4health.local/edc-cp/assets/request
    To add a polic - POST http://dataspace4health.local/edc-cp/contractdefinitions/
    To get all policies - POST http://dataspace4health.local/edc-cp/policydefinitions/request
    To add a contract definition - POST http://dataspace4health.local/edc-cp/contractdefinitions/
    To get all contract definitions - POST http://dataspace4health.local/edc-cp/contractdefinitions/request
    To initiate negotiation - POST http://dataspace4health.local/edc-cp/contractnegotiations
    To get negotiation status - POST http://dataspace4health.local/edc-cp/contractnegotiations/request

**Data Plane**
    Registers itself to control plane for data transfer purposes

# Build and Test
1.	Build and push all the images as listed-
    1.1  Repo for the code base of controlplane - **edc-controlplane**
    1.2  Repo for the code base of dataplane - **edc-dataplane**
    1.3  Repo for the code base of identityhub - **edc-identityhub**
2.	Run **make clean && make uninstall && make build && make install** on top level of the helm directy to build and install the helm

# Contribute
Author : Aastha Rai
Improvements are welcome. You can also contribute in the project, make sure to use values.yaml and not hardcode the values of probes in charts.