# Parte 3 - 📦 Packaging

En el laboratorio anterior, utilizó Actions de GitHub para crear un workflow de integración continua (CI). El siguiente paso en un proceso clásico de entrega continua **package and release** de tu aplicación.

En este laboratorio, extenderá el workflow que creó para empaquetar la aplicación como una imagen de contenedor y publicarla en el registro de contenedores GitHub.

Opcionalmente, puede implementar la aplicación en un entorno de su elección, por ejemplo, el servicio Azure Kubernetes (AKS). 

Como la implementación es muy individual para sus requisitos específicos, brindamos solo orientación y no ofrecemos ejemplos concretos.

## 1 - 	📊 Usando el gráfico de visualización

Cada workflow Run genera un gráfico en tiempo real que ilustra el progreso de ejecución. Puede usar este gráfico para monitorear y depurar workflows. El gráfico muestra cada job en el workflow. Un icono a la izquierda del nombre del job indica el estado del job. Las líneas entre jobs representan dependencias.

## 2 - ⚙️ Jobs Dependientes

Por defecto, los jobs en su workflow correr en paralelo al mismo tiempo. Si tiene un job que debe ejecutarse solo después de que se haya completado otro job, puedes usar el `needs` Palabra clave para crear esta dependencia. Si uno de los jobs falla, todos los jobs dependientes se omiten. Sin embargo, si desea que los jobs continúen, puede definir esto usando el `if` sentencia condicional. En el siguiente ejemplo, el `build` y `publish-container` se ejecutan en serie, con `publish-container` depende de una finalización con exito de `build`:

```yml
jobs:
  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      # Build Node application
      - ...
        ...
  publish-container:
    needs: build
    runs-on: ubuntu-latest
    steps:
      # Build and publish Docker image
      - ...
        ...
```

## 3 - 🗳️ (Package) su aplicación como imagen de contenedor

Para entregar su solicitud, deberá completar los siguientes pasos:

1. Crear un nuevo job que depende del job `build` .
2. Agregar steps para construir y publicar una imagen de contenedor.

Al construir workflows, siempre debes revisar el GitHub Marketplace para asegurarse que la `actions` puede realizar algunos de los `workflow steps`.

#### 🛒 GitHub Marketplace

1. Visita el GitHub Marketplace: <https://github.com/marketplace>
2. Buscar "Docker".
3. Desplácese hacia abajo hasta la seccion **Actions**.

Encontrarás muchos `actions` relacionados con Docker. Para este laboratorio, utilizará las siguientes `actions`:

- [Docker Login](https://github.com/marketplace/actions/docker-login): para conectarse al GitHub Container Registry (<https://ghcr.io>).
- [Build and push Docker images](https://github.com/marketplace/actions/build-and-push-docker-images).

### 3.1 - Editar el workflow

1. Editar el archivo `.github/workflows/node.js.yml`, y agregar el `package-and-publish` job para que el archivo se vea así:

    ```yaml
    name: Packaging

    on:
      push:
        branches: [ main ]
      pull_request:
        branches: [ main ]
      workflow_dispatch:

    jobs:
      build:
        name: Build and Test
        runs-on: ubuntu-latest
        permissions:
          contents: read
          pull-requests: write
        steps:
        - uses: actions/checkout@v3
        - name: Use Node.js 16.x
          uses: actions/setup-node@v3
          with:
            node-version: 16.x
            cache: npm
        - run: npm ci
        - run: npm run build --if-present
        - run: npm test
        - name: Report Coverage
          uses: davelosert/vitest-coverage-report-action@v2
          if: always()

      package-and-publish:
        needs:
          - build

        name: 🐳 Package & Publish
        runs-on: ubuntu-latest
        permissions:
          contents: read
          packages: write

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

          - name: Generate Docker Metadata
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
    ```

2. Edita los cambios a `.github/workflows/node.js.yml`.

3. Al hacer `push`, la workflow iniciará automáticamente y llevará a cabo el flujo completo de CI.

4. Revisa el workflow e inspecciona el "Build and Publish Container Image" logs.

## 4 - 🔐 El GITHUB_TOKEN

Como habrás notado en el `package-and-publish` job de la workflow Archivo mencionado anteriormente, usamos el [`GITHUB_TOKEN`](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret) para iniciar sesión en el GitHub Container Registry y hacer push en el Docker image.

```yaml
        - name: Sign in to GitHub Container Registry
          uses: docker/login-action@v2
          with:
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}
            registry: ghcr.io
```

Puede recordar el `GITHUB_TOKEN` de [Part 02 - Basics of CI with Actions](002-basics-of-ci-with-actions.md) Cuando discutimos los permisos de workflow.

Estos permisos no se aplican automáticamente a un workflow; en realidad se pasan a `GITHUB_TOKEN`, que se almacena convenientemente como un predeterminado `secret`. Pensar en `GITHUB_TOKEN` como una combinación de un nombre de usuario y contraseña que otorga acceso a los recursos de GitHub.

Muchas Actions, como `davelosert/vitest-coverage-report-action`, usan este token de forma predeterminada, por lo que generalmente no tiene que especificarlo.

Sin embargo, algunas Actions, como `docker/login-action`, requiere que pase explícitamente el token a través de los parámetros de entrada de la acción. En estos casos, puede acceder fácilmente a él usando el `secrets` contexto, como se demostró anteriormente con `${{ secrets.GITHUB_TOKEN }}`.

### Límites del GITHUB_TOKEN

Tenga en cuenta que los permisos que se pueden otorgar al `GITHUB_TOKEN` se limitan al alcance del repositorio donde se ejecuta el workflow de las Actions.
Si bien esto es suficiente para muchos casos de uso, hay momentos en los que puede acceder o modificar algo en otro repositorio o incluso a nivel de organización.

Este escenario está más allá del alcance de este taller, pero si está interesado en abordar esto, tiene dos opciones:

1. Crear un [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) con los permisos necesarios y luego proporcionarlo al workflow de las Actions de GitHub por [storing it as a repository secret](https://docs.github.com/en/enterprise-cloud@latest/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository).
2. Create and install a [GitHub App](https://docs.github.com/en/enterprise-cloud@latest/apps/maintaining-github-apps/installing-github-apps) in your organization, and then use the [workflow application token action](https://github.com/peter-murray/workflow-application-token-action) generar un token de corta duración durante la ejecución del workflow.

## 5 - 🧰 Localice su imagen en el GitHub Container Registry

1. Navegue a su proyecto.
2. Clickea en el **Packages**.
3. Seleccione su contenedor.

![](../images/img-037.png)


