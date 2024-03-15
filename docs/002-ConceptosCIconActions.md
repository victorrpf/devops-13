# Parte 2: Conceptos básicos de CI con Actions

## 1 -  Inspeccionar el repositorio

Este repositorio contiene una aplicación basada en [React](https://reactjs.org/). Nuestro objetivo es automatizar sus pruebas y construcción en este laboratorio.

Siéntete libre de explorar los archivos si tienes curiosidad sobre el funcionamiento de la aplicación (aunque no es estrictamente necesario para comprender el resto del Workshop).

- [`src/main.tsx`](../src/main.ts) : Este es el principal punto de entrada de la aplicación.
- [`src/pages/Home.tsx`](../src/pages/Home.tsx) : Esta ruta contiene la mayor parte de lo que verá al iniciar la aplicación.
- [`src/pages/Home.test.ts`](../src/pages/Home.test.tsx) :  Aquí encontrará  [`vitest`](https://vitest.dev/) pruebas que ejecutaremos con GitHub Actions.
- [`Dockerfile`](../Dockerfile) : Este archivo Docker empaqueta la aplicación en un contenedor que se utilizará más adelante en este Workshop.


## 2 - Implementar Integración Continua (CI)

### 2.1 - Utilice un workflow inicial

Para crear un workflow que emplee Actions para su proceso de integración continua, comience agregando un **starter workflow** a su repositorio:

1. Desde la vista principal de su repositorio, busque y navegue hasta la pestaña **Actions** .
2. Seleccione **New workflow**.
3. Buscar `Node.js`.
4. Haga clic en **Configure** debajo del `Node.js` workflow inicial.
5. En el `node-version` campo dentro de la configuración de YAML, elimine 14.x.

Para terminar tu CI workflow, haz un commit del archivo `node.js.yml` a la rama `main` .

<details>
<summary>Tu archivo `.github/workflows/node.js.yml` debe contener lo siguiente:</summary>

```yml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x]
        # See supported Node.js release schedule at https://nodejs.org/en/about/releases/

    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
```

</details>

### 2.2 - Comprender las referencias a Actions

Como puede ver, ahora estamos empleando una segunda acción en nuestro workflow, `actions/setup-node`, que se utiliza para instalar una versión específica de Node.js en el `runner`.

Analicemos la referencia a esa acción para comprender su estructura:

- `actions/` hace referencia al propietario de la acción, que se traduce en un usuario u organización en GitHub.
- `setup-node` hace referencia al nombre de la acción, que corresponde a un repositorio en GitHub.
- `@v3`representa la versión de la acción, que corresponde a una etiqueta Git o una referencia general (como una rama o incluso un SHA de confirmación) en el repositorio.

Esta estructura de referencia hace que sea sencillo navegar hasta el código fuente de cualquier acción simplemente agregando `owner` y `name` a el `github.com` URL, asi: `https://github.com/{owner}/{name}`. Para el ejemplo anterior, sería <https://github.com/actions/setup-node>.

### 2.3 - Understanding matrix builds

Observe que nuestro workflow emplea una [matrix build strategy](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) con dos versiones de Node.js: 16 y 18. Una matrix build le permite ejecutar un trabajo en paralelo utilizando varios parámetros de entrada. En nuestro caso, ejecutamos el mismo trabajo dos veces, pero con distintas versiones de Node.js.

### Comprobación de ejecuciones de workflow

Su workflow de CI recién implementado ahora se ejecuta con cada pulsación. Dado que acaba de enviar una nueva confirmación que contiene el workflow que creó, ya debería tener un workflow ejecutándose.

![Actions overview showing the Node.js workflow running](./images/running-nodejs-workflow.png)

Tenga en cuenta que necesitaremos ejecutar pruebas como parte de nuestro workflow de CI. Puede encontrar la mayoría de las pruebas de esta aplicación en el [`src/pages/Home.test.tsx`](../src/pages/Home.test.tsx) archivo, que en parte se parece a esto:

```typescript
// ... imports

describe("<Home />", (): void => {
  afterEach((): void => {
    cleanup();
  });

  it("renders the octocats returned from the API.", async (): Promise<void> => {
    const inMemoryAPI = createInMemoryOctocatApi();
    inMemoryAPI.addOctocats([
      createTestOctocat({ id: "#1", name: "Octocat 1" }),
      createTestOctocat({ id: "#2", name: "Octocat 2" }),
    ]);

    renderWithProviders({ component: <Home />, inMemoryApi: inMemoryAPI });

    expect(await screen.findByText("Octocat 1")).toBeDefined();
    expect(screen.getByText("Octocat 2")).toBeDefined();
  });

  // ... more tests

});

```

El resultado de su último push a la rama principal debería parecerse al siguiente:

![Actions overview showing a successful workflow run](./images/success-nodejs-workflow.png)

## 3 - Añade cobertura de código a tu workflow

Al configurar CI para su proyecto, es común proporcionar información adicional a los usuarios, como estadísticas de cobertura de código para las pruebas del proyecto.

Hacerlo es sencillo con GitHub Actions. Puedes determinar dónde y cuándo debe realizarse una tarea específica y luego buscar un `Action` adecuada en [GitHub Marketplace](https://github.com/marketplace?category=&query=&type=actions&verification=).

### 3.1 - Encuentra una acción en el mercado

1. Busque un Action en  GitHub Marketplace:  `vitest coverage report`
  ![Search Result for "Vitest Test Coverage" in the GitHub Marketplace](./images/marketplace-vitest-search-result.png)

2. Click en la action **Vitest Coverage Report**.

3. Incorpore la acción a su workflow.

### 3.2 - Permisos en un workflow

Este es un buen momento para discutir **permissions** dentro de un workflow. Cualquier workflow que interactúe con recursos de GitHub requiere permisos para hacerlo. Al administrar los permisos, los usuarios de GitHub pueden garantizar que solo los usuarios o procesos autorizados puedan realizar Actions específicas, como llamar a una API con una clave de acceso privada, ejecutar ciertas automatizaciones o implementar en entornos de producción. Esto evita el acceso no autorizado a datos confidenciales, reduce el riesgo de cambios no intencionados o maliciosos y ayuda a mantener la seguridad y estabilidad generales del código base. Por ejemplo:

1. La `actions/checkout` action requiere permisos de lectura para que su repositorio ejecute el `checkout` en la máquina que lo ejecuta.
2. El**Vitest Coverage Report** action necesita escribir un comentario en una `pull request` y, por lo tanto, necesita permisos para hacerlo.

De forma predeterminada, los flujos de trabajo de GitHub Actions se ejecutan con un [set of default permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token), que se pueden ampliar según sea necesario con la palabra clave `permissions`. Esto se puede aplicar:

- En la raíz del workflow para establecer este permiso para **all** los trabajos dentro del workflow.
- Dentro de la propia definición  [job](https://docs.github.com/en/actions/using-jobs) para especificar permisos solo para ese trabajo. Este enfoque se recomienda desde una perspectiva de seguridad, ya que proporciona los privilegios menos necesarios para sus `workfows` y `jobs`.

Estos permisos se aplican a `GITHUB_TOKEN`, que exploraremos con más detalle más adelante.

Por ahora, lo que necesitas saber es: tan pronto como especifica la palabra clave `permissions`, los permisos predeterminados ya no se aplican. Esto significa que debe configurar explícitamente todos los permisos necesarios en el job o workflow. Hagamos esto en el siguiente paso.

### 3.3 - Actualizacion del workflow

1. En la rama `main`, edita el CI workflow `.github/workflows/node.js.yml`

2. Agrega la palabra clave `permissions` con los siguientes permisos en la seccion del job:

    ```yml
    build:
      runs-on: ubuntu-latest
      permissions:
        # Required to allow actions/checkout to clone the repository onto the runner
        contents: read
        # Required to allow the vitest coverage action to write a comment into the pull request
        pull-requests: write
      # ... rest of the node.js.yml
    ```

3. Agregue el siguiente paso en la seccion de `build` de su workflow, justo después del paso `npm test`:

    ```yml
        # ... rest of the node.js.yml
        - run: npm run test
        - uses: davelosert/vitest-coverage-report-action@v1
          with:
            vite-config-path: vite.config.ts
    ```

4. Mientras lo haces, ¿qué tal si mejora el trabajo `name`?

    ```yml
      jobs:
        build:
          name: "Build and Test"
          runs-on: ubuntu-latest
      # ... rest of the node.js.yml
    ```

5. Confirme el archivo `node.js.yml`.

### 3.4 - Eliminar la estrategia de construcción de matrices

Como se trata de un proyecto frontend, no necesitamos una estrategia de creación de matrices (que es más adecuada para proyectos backend que pueden ejecutarse en varias versiones de Node.js). Eliminar la construcción de `matrix` también hará que las pruebas se ejecuten solo una vez.

<details>
<summary>Intente eliminar la compilación de la matriz usted mismo y haga que la acción `actions/setup-node` solo se ejecute en la versión 16.x. Expanda esta sección para ver la solución.</summary>

```yml
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
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: 'Report Coverage'
        uses:  davelosert/vitest-coverage-report-action@v2
```

</details>

### 3.5 - Crear una nueva solicitud de extracción

1. Vaya a la página principal del repositorio.

2. Haga clic en [`./src/main.tsx`](../src/main.tsx), y edite el archivo (por ejemplo, agregue un comentario).

3. Desplácese hacia abajo y haga clic en  **Create a new branch for this commit and start a pull request**.

4. Haga clic en **Propose changes**.

5. Haga clic en **Create pull request**.

6. Espere a que se ejecute el workflow de CI y verá un nuevo comentario en su `pull request` con la `code coverage`

![PR Comment with a coverage report from vitest](./images/vitest-coverage-report.png)

## EJERCICIO: Vamos a crear un nuevo workflow, con un job CI donde por medio de la accion sonarsource/sonarqube-scan-action@master analizaremos la calidad de nuestro codigo. [GitHub Marketplace](https://github.com/marketplace/actions/official-sonarqube-scan)



## EJERCICIO: En el workflow anterior, en el job CI agregaremos tres nuevos steps:

1. En el primero crearemos un fichero txt con el contenido que quieras, sientete libre pequeño Padawan!.

2. En el segundo step, por medio de una accion crea un ZIP con el archivo anteriormente creado [GitHub Marketplace](https://github.com/marketplace).

3. En el tercer step, por medio de una accion sube (upload) el zip anterior como artefacto [GitHub Marketplace](https://github.com/marketplace).
