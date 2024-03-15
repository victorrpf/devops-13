RG=innotech-devops 
LOCATION=northeurope 
ACI_NAME=aci-sonarqube 
SONARQUBE_IMAGE=sonarqube
SONARQUBE_PORT=9000 
SONARQUBE_FQDN=spike-sonarprueba 
#az group create --name $RG --location $LOCATION 
az container create --resource-group $RG --name $ACI_NAME --cpu 2 --memory 4 --image $SONARQUBE_IMAGE --ports $SONARQUBE_PORT --dns-name-label $SONARQUBE_FQDN