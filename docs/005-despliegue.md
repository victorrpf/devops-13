# Parte 5 - Deployment: Azure 

En la práctica de laboratorio anterior, se utiliza GitHub Actions para empaquetar una aplicación en una imagen de Docker y publicar ese paquete en el registro de GitHub Container. El siguiente paso en un proceso clásico de entrega continua es el **deploy** la aplicación.

En esta práctica de laboratorio, ampliará el flujo de trabajo para implementar la imagen del contenedor en [Azure Web Apps](https://azure.microsoft.com/en-us/products/app-service/web), un servicio de aplicación web administrado en Azure que también admite la implementación de contenedores.

Aprenderá cómo autenticarse fácilmente en Azure mediante una acción, utilizar variables de acciones para definir valores de configuración para sus acciones y establecer aprobaciones de implementación manuales para sus entornos.


## 1 - Variables de acciones y secretos

### 1 Crear una nueva variable de Acciones

Ya ha aprendido a utilizar variables dentro de un flujo de trabajo. Sin embargo, hasta ahora, solo ha utilizado variables proporcionadas por el propio GitHub. Ahora, aprendamos cómo agregar sus propias variables (y secretos) para definir configuraciones específicas del repositorio y otros valores que quizás no desee codificar en sus archivos de flujo de trabajo.


1.1. Asigne un nombre a la variable `AZ_APP_NAME`y proporcione un valor de su elección, preferiblemente el nombre de su repositorio (dado que el nombre de la aplicación debe ser único en todos los servicios web de Azure, elija algo distintivo). Haga clic en Agregar variable una vez terminado.
    ![Create a new variable](./images/005/issue-ops-007-create-az-app-name.png)

Ahora, ha creado una variable a la que se podrá acceder desde todos los flujos de trabajo dentro de este repositorio como ${{ vars.APP_NAME }}. Haremos uso de esto en nuestro flujo de trabajo de implementación.




## 2- amplíe el flujo de trabajo para implementarlo en la etapa de preparación

Es hora de poner todo en acción con un despliegue real. En laboratorios anteriores, creó la aplicación y la empaquetó en una imagen de contenedor, que luego se publicó en el registro de GitHub Container. Para iniciar la aplicación, debe ejecutar esta imagen de contenedor. Existen varios métodos para lograr esto, como a través de Azure Container Instances, Azure Web Apps para Linux o dentro de un clúster de Kubernetes como Azure Kubernetes Services (AKS). Además, Azure ofrece un servicio de aplicación web administrado conocido como Azure Web Apps, capaz de ejecutar instancias de contenedor. Para este taller, implementará la imagen del contenedor en Azure Web Apps.

Una de las mejores prácticas recomendadas para las implementaciones implica definir recursos mediante código (Infraestructura como código o IaC). Este proyecto viene equipado con scripts [Bicep](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview?tabs=bicep) scripts que detallan toda la infraestructura. Sin embargo, también se pueden utilizar alternativas como Terraform para ese fin.

### 2.1 Utilización de infraestructura como código (IaC)

Los archivos de Bicep para la implementación se encuentran en la carpeta [`/infra/web-app`](../infra/web-app/) del repositorio, que consta de dos archivos distintos:

| Archivo            | Descripción                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `main.bicep`    |El archivo de infraestructura principal, que crea un grupo de recursos de Azure e invoca los demás archivos para crear el entorno completo. |
| `web-app.bicep` | Especifica la aplicación en sí, como una aplicación web para contenedores.                                                                          |

Para configurar los servicios de infraestructura necesarios e implementar la aplicación, utilizará la interfaz de línea de comandos de Azure (`az cli`). Pronto integrará este paso en el flujo de trabajo. Sin embargo, antes de eso, es esencial que el paquete sea de acceso público.

### 2.2 Publicar el paquete

Si bien generalmente no se recomienda hacer públicas las imágenes de los contenedores (a menos que esté trabajando con código fuente abierto), lo hará por la simplicidad de esta práctica de laboratorio. En un escenario real, el paquete seguiría siendo privado y sería necesario proporcionar a Azure las credenciales de registro necesarias para acceder a las imágenes del contenedor.

1. Dirígete a la página principal de tu repositorio y haz clic en Paquetes . Busque el paquete correspondiente y ábralo.

2. Haga clic en el botón Configuración del paquete en la parte inferior derecha de la página:

    ![Click on Package settings](images/005/package-settings-button.png)

3. Desplácese hasta el final de la página y haga clic en Cambiar visibilidad :

    ![Click change visibility](images/005/danger-zone.png)

4. Cambie la visibilidad a Pública , ingrese el nombre del repositorio y presione el botón confirmar:

    ![Confirm your changes](images/005/change-visibility.png)

### 2.3 Agregar el paso de implementación al flujo de trabajo

Ahora es el momento de ajustar el flujo de trabajo, integrando la automatización para la implementación de la aplicación.

Abre el `node.js.yml`.  Inmediatamente después del `package-and-publish` job,  inserte el siguiente trabajo:

```yml
  staging:
    name: Deploy to Staging
    needs: [package-and-publish]
    runs-on: ubuntu-latest
    ## Only deploy after merges to the main branch, not on every PR
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
    environment:
      name: staging
      url: "${{ steps.deploy.outputs.url }}"

    steps:
      - uses: actions/checkout@v2

      - name: Log in to Azure using credentials
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy resources
        uses: azure/arm-deploy@v1
        id: deploy
        with:
          scope: subscription
          region: westeurope
          deploymentName: ${{ vars.AZ_APP_NAME }}-deployment
          template: ./infra/web-app/main.bicep
          parameters: "containerImage=${{ needs.package-and-publish.outputs.container }} actor=${{ github.actor }} appName=aw-${{ vars.AZ_APP_NAME }} repository=${{ github.repository }}"
```

Finalmente, debe incluir un [`output`](https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs) en su `package-and-publish` job para recuperar el nombre de la imagen del contenedor del registro. Esto se utilizará durante la implementación de Azure para configurar el alojamiento del contenedor.

```yml
     runs-on: ubuntu-latest
     outputs:
       container: ${{ steps.meta.outputs.tags }}
```

<details>
<summary>Haga clic aquí para ver cómo debería verse el archivo de flujo de trabajo completo</summary>

```yml
name: Node.js CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  build:
    name: "Build and Test"
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16.x
          cache: "npm"
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - name: "Report Coverage"
        if: always()
        uses: davelosert/vitest-coverage-report-action@v2

  package-and-publish:
    needs:
      - build
    name: 🐳 Package & Publish
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      container: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Sign in to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          registry: ghcr.io

      - name: Generate docker metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=tag
            type=ref,event=pr
            type=sha,event=branch,prefix=,suffix=,format=short
      - name: Build and Push Docker Image
        uses: docker/build-push-action@v2
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  staging:
    name: Deploy to Staging
    needs: [package-and-publish]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      id-token: write
    environment:
      name: staging
      url: "${{ steps.deploy.outputs.url }}"

    steps:
      - uses: actions/checkout@v2

      - name: Log in to Azure using OIDC
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy resources
        uses: azure/arm-deploy@v1
        id: deploy
        with:
          scope: subscription
          region: westeurope
          deploymentName: ${{ vars.AZ_APP_NAME }}-deployment
          template: ./infra/web-app/main.bicep
          parameters: "containerImage=${{ needs.package-and-publish.outputs.container }} actor=${{ github.actor }} appName=aw-${{ vars.AZ_APP_NAME }} repository=${{ github.repository }}"
```

</details>

El nuevo trabajo realiza las siguientes tareas:

- Tiene como objetivo un entorno denominado `staging`. Este enfoque simplifica el proceso de comprender qué se implementa y dónde. También proporciona un enlace directo al objetivo dentro de GitHub.
- Determina la URL del entorno examinando los resultados del step `Deploy resources`. Este paso lee el parámetro de salida del archivo Bicep.
- Comprueba el código para acceder a la infraestructura como archivos de código.
- Inicia sesión en Azure utilizando los secretos proporcionados por su organización.
- Invoca la  `azure/arm-deploy` acción para implementar la aplicación en Azure. Esto se hace pasando la plantilla principal y los parámetros adicionales, incluido el  `appName` que proporcionó como variable de Acciones.

Confirme los cambios del archivo para activar la ejecución del flujo de trabajo.

### 2.4 Navegar al entorno de prueba

1. Una vez completada la ejecución del flujo de trabajo, debería ver un vínculo en el trabajo Implementar en ensayo en el gráfico de visualización del flujo de trabajo:

    ![Deployment success](images/005/deploy-success.png)

2. Haga clic en el enlace para abrir la aplicación que se ejecuta en Azure.

    ![Running app](images/005/running-app.png)

## 3 - Configurar la aprobación requerida para el entorno de ensayo

Ahora que la implementación está funcionando, es posible que desee introducir un proceso de aprobación manual.

1. Navegue hasta la Configuración de su repositorio , luego haga clic en Entornos y luego seleccione preparación :

    ![Configure staging](images/005/click-env.png)

2. Asegúrese de que la opción Revisores requeridos esté seleccionada y agréguese como revisor.
3. Haga clic en Guardar reglas de protección para confirmar sus cambios:

    ![Configure staging](images/005/approvers.png)

4. La próxima vez que inserte código, el flujo de trabajo se detendrá en el trabajo Implementar en ensayo y esperará la aprobación manual antes de ejecutar los pasos posteriores del trabajo.


## EJERCICIO: en el workflow creado  en [Conceptos básicos de CI con Actions](./docs/002-ConceptosCIconActions.md) agregaremos un nuevo job (CD) que depende del job (CI), en este nuevo job agregaremos 4 steps:

1. En el primero descargaremos el artefacto creado en el CI.

2. En el segundo step, haremos un un zip utilizando su correspodiente accion [GitHub Marketplace](https://github.com/marketplace).

3. En el tercer step, haremos un cat del .txt una vez.

4. En el cuarto step, se enviara un email utilizando la action 'action-send-email', donde se incluira en el body el resultado del lanzamiento del workflow.[GitHub Marketplace](https://github.com/marketplace).