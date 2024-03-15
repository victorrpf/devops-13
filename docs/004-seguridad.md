# Parte 4 - Seguridad

En el laboratorio anterior, empaquetó su aplicación y ahora está casi listo para la implementación. Pero primero, debemos asegurarnos de no introducir ningún riesgo de seguridad para nuestra infraestructura de producción con nuestros cambios.

Después de todo, la NASA no lanzaría un cohete sin garantizar su seguridad, ¿verdad?

Security es una parte integral del desarrollo de software. Hay mucho en juego. No puede ser simplemente una idea de último momento en lo que haces. En cambio, ¡debe integrarse firmemente en su ciclo de vida de desarrollo de software!

Debemos detectar y arreglar vulnerabilidades lo antes posible, y para esto, **automation** juega un papel importante.

En este laboratorio, aprovechará las acciones de GitHub para mejorar la seguridad a través de la automatización creando dos nuevos flujos de trabajo:

1. **Supply-chain security**: Usarás el [dependency review action](https://github.com/actions/dependency-review-action) Para asegurarse de que no introduzca dependencias vulnerables en sus solicitudes de extracción.Esto es crucial ya que, en promedio, 80% del código en su proyecto proviene de bibliotecas de terceros.¡Necesitamos asegurarnos de que estén seguros antes de usarlos!

2. **Code security**: Realizará un análisis de código estático con CodeQL para asegurarse de que no introduzca vulnerabilidades de seguridad a través de los cambios en el código que realiza.Después de todo, ¡incluso los científicos de cohetes cometen errores!

> **Note**:
> Ambas características son parte de GitHub Advanced Security (o GHAS para abreviar), que ofrece características de seguridad adicionales más allá de las acciones que estamos utilizando en este taller. Es gratis para repositorios públicos y, por lo tanto, se puede usar en este workshop.Para más detalles, ver [esta página](https://docs.github.com/en/code-security/secure-coding/about-github-advanced-security).

## Preparación: permitir Dependency graph y Github Security Avanzado (GHAS)

Para activar ambos features, Primero debemos preparar nuestro repositorio habilitando el Dependency graph y la seguridad avanzada de GitHub:

![Captura de pantalla que muestra la pestaña de seguridad y análisis de código en la configuración del repositorio](images/004/enable_graph_and_ghas.png)

1. Navegue a su repositorio settings.
2. Elegir el **Code security and analysis** tab.
3. Click **Enable** for **Dependency graph**.
4. Si su repositorio no es público, click **Enable** for **GitHub Advanced Security** y confirmar la activación haciendo clic en **Enable GitHub Advanced Security for this repository** (Los repositorios públicos tienen disponibles GHAS features habilitado por default).
   ![Captura de pantalla del github Advanced Security diálogo de confirmación de activación](images/004/confirm_ghas_activation.png)

## 1. Agregar revisión de dependencia

Habilitando el dependency graph, we've permitió que Github analice el [`package.json`](../package.json) y [`package-lock.json`](../package-lock.json) archivos en nuestro repositorio para monitorear todas las dependencias.

Puede verificar su funcionalidad yendo a **Insights** > **Dependency graph** En su repositorio:

![Captura de pantalla del dependency graph](images/004/dependency_graph.png)

Podemos usar estos datos con el [Acción de revisión de dependencia](https://github.com/actions/dependency-review-action), qué referencias cruzadas nuevas dependencias y versiones de dependencia contra known vulnerabilities en el [GitHub Advisory Database](https://github.com/advisories).

### 1.1 - Agrega una dependency review workflow

1. Crear un nuevo workflow llamdo `.github/workflows/dependency-review.yml` con el siguiente contenido:

    ```yml
    name: Dependency Review
    on: pull_request

    permissions:
      contents: read
      pull-requests: write

    jobs:
      dependency-review:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout Repository
            uses: actions/checkout@v3
          - name: Dependency Review
            uses: actions/dependency-review-action@v3
            with:
              comment-summary-in-pr: true
    ```

2. Guarde este archivo a su rama `main`.

### 1.2 - Asegúrate de que funcione

Probemos si esto workflow Funciona correctamente. Para hacerlo,instalaremos una nueva dependencia. Siga los pasos a continuación en un repositorio clonado en su máquina local o desde dentro de un GitHub Codespace:

1. Abrir una terminal.

2. Crear un nuevo branch llamado `add-vulnerability`.

    ```bash
    git checkout -b add-vulnerability
    ```

3. Instalar `lodash` versión `4.17.20`, que se sabe que es vulnerable:

    ```bash
    npm install lodash@4.17.20
    ```

4. Esto modificará tanto el `package.json` y el `package-lock.json` files. Commit estos cambios y push la branch a GitHub:

    ```bash
    git add package.json package-lock.json
    git commit -m "Add vulnerable dependency"
    git push -u origin add-vulnerability
    ```

5. Abre un pull request a tu branch. Si no estás familiarizado con cómo abrir un pull request,  [documentación sobre la creación de un pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request?tool=cli).

6.Al abrir una solicitud de extracción, activará el `Dependency Review` workflow. Sin embargo, fallará debido a la vulnerabilidad recientemente introducida. Desde que establecimos el `comment-summary-in-pr` opción a `true`, un comentario que contiene un resumen de las vulnerabilidades encontradas
se agregará automáticamente al pull request.
    ![Captura de pantalla del comentario de solicitud de extracción con el resumen de vulnerabilidad](images/004/dependency_review_pr_comment.png)

    Alternativamente, también puede ver el resumen en el workflow run's dashboard. Click sobre el **Details** enlace junto al fallido check, y luego navegar al workflow **Summary**:

    ![Screenshot of the failed Dependency Review check](images/004/failed_dependency_review.png)

    ![Screenshot of the dependency review summary](images/004/dependency_review_summary.png)

Inspeccionar los enlaces en el resumen. Ellos lo dirigirán al aviso en GitHub, donde puede encontrar más detalles sobre la vulnerabilidad y las recomendaciones para la remediación.

> **Note**:
Tiene la opción de arreglar la vulnerabilidad actualizando a la versión parcheada de `lodash`. Este paso no es obligatorio proceder con el taller, por lo que puede mantener el pull request como referencia si lo prefiere.

La revisión de dependencia workflow el resumen también puede tocar las licencias, Por ejemplo, si estás presentando un dependency con una licencia prohibida basada en la configuración de la dependencia revisar action. Puedes aprender más leyendo el [revisión de dependencia action README](https://github.com/actions/dependency-review-action).

## 2. Agregar escaneo de código con CodeQL

Ahora, integremos otra seguridad característica en nuestro repositorio: CodeQL, GitHub's static code analysis (SCA) tool.

CodeQL funciona primero creando una base de datos desde su código y luego ejecutando un conjunto de consultas predefinidas en esta base de datos. Cada consulta detecta un tipo específico de vulnerabilidad. Estas consultas se escriben en un idioma personalizado llamado QL y se almacenan en el oficial [CodeQL repository](https://github.com/github/codeql). Por lo tanto, cuando se desarrollan y se agregan nuevas consultas a este repositorio, automáticamente estarán disponibles para que lo use.

Crearemos un workflow que realizará el escaneo de código con CodeQL.

### 2.1 - Agrega un CodeQL workflow

En su repositorio, navegar a **Actions**, entonces click **New workflow**. Desplácese hacia abajo hasta el **Security** sección, encuentra el **CodeQL Analysis** workflow, y haga clic en **Configure**:

![Captura de pantalla del CodeQL Analysis workflow](images/004/configure_codeql_analysis.png)

Examina el `.github/workflows/codeql.yml` archivo que se establece para ser creado. Antes de cometerlo, let's comprender y posiblemente modificar algunos de sus componentes.

1. La `on:` La sección define varios desencadenantes. Ya estás familiarizado con el `push` y  `pull_request` triggers de los workflows anteriores. La `schedule` trigger, Sin embargo, podría ser nuevo para ti:

    ```yml
    on:
      push:
        branches: [ main ]
      pull_request:
        branches: [ main ]
      schedule:
        - cron: '23 18 * * 1'
    ```

    Como el nombre sugiere, esta trigger iniciará el workflow en un schedule, lo que significa que se ejecutará en momentos o intervalos especificados. La `cron` expresión define esto schedule en un formato que sea fácil de entender. En esta configuración, Está programado para funcionar todos los lunes a las 6:23 p.m.. Para obtener una comprensión más profunda de la sintaxis, puedes consultar la [GitHub Docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule).

    Se recomienda ejecutar un escaneo de código una vez a la semana ya que podrían haberse agregado nuevas consultas al CodeQL, revelando vulnerabilidades que previamente no se detectaron en su código.

2. La sección presenta otro `matrix`, un concepto con el que ya estás familiarizado:

     ```yml
    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript' ]
    ```

    Pero que pasa `fail-fast`? Por defecto, Si algún job en una matrix de job falla, el restante de jobs se detienen inmediatamente para ahorrar Actions minutes. Configurando `fail-fast` a `false`, anulamos este comportamiento predeterminado. Esto asegura todo jobs en el job matrixCompleta su ejecución, regardless del resultado de individual jobs.

    Esta configuración es especialmente útil para proyectos que usan múltiples idiomas. Si bien no es el caso aquí, no hace daño mantener esta configuración.

3. La sección de pasos incluye el `Initialize CodeQL` step. Este paso descarga el CodeQL CLI y inicializa el CodeQL database poblándolo con el código de nuestro repositorio.

    ```yml
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: ${{ matrix.language }}
    ```

4.La `Autobuild` step es específicamente beneficioso para idiomas compilados como Java, C++, y Go. Para tales idiomas, CodeQL observa cómo se compila la aplicación para obtener resultados de exploración más precisos. Sin embargo, dado que nuestra aplicación está construida con JavaScript/Typescript, esta step es innecesario, por lo que puede omitirlo de manera segura en su flujo de trabajo.

    ```yml
    - name: Autobuild
      uses: github/codeql-action/autobuild@v2
    ```

5. La `Perform CodeQL Analysis` step runs la CodeQL queries en contra de la database que contiene su código. Una vez completado, carga los resultados a GitHub, permitiéndole examinarlos.

    ```yml
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
      with:
        category: "/language:${{matrix.language}}"
    ```

6. Guardar estos cambios y commit este archivo a un nuevo branch llamado `add-codeql`. Después de esto, abra un pull request apuntando a la rama `main`.

<details>
<summary>La versión final del workflow el archivo debe verse así:</summary>

```yml
name: "CodeQL"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript' ]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          category: "/language:${{matrix.language}}"
```

</details>


### 2.2 Agregar una vulnerabilidad

Afortunadamente, no parece tener ninguna vulnerabilidad en su código. 😮‍💨

Presentemos uno para ver cómo CodeQL opera y nos alerta dentro de un pull request, habilitándonos abordarlo antes de que se fusione en el `main` branch.

Realizar lo siguiente actions en un repository clonado en su máquina local o desde un github Codespace:

1. Abra una terminal y consulte el `add-codeql` rama que acabamos de crear:

    ```bash
    git fetch --all
    git checkout add-codeql
    ```

2. Navegue al archivo [`src/components/OctoLink.tsx`](../src/components/OctoLink.tsx) y mira la función `sanitizeUrl`en línea 10:

    ```tsx
    function sanitizeUrl(url: string) {
      // UNCOMMENT THE FOLLOWING LINES TO INTRODUCE A SECURITY VULNERABILITY FOR STEP 04: SECURITY
      // const u = decodeURI(url).trim().toLowerCase();
      // if (u.startsWith("javascript:")) {
      //   return "about:blank";
      // }
      return url;
    }
    ```

3. Hay un código comentado que es, de hecho, inseguro. Elimine los comentarios (eliminar el `//` al comienzo de cada línea):

    ```tsx
    function sanitizeUrl(url: string) {
      // UNCOMMENT THE FOLLOWING LINES TO INTRODUCE A SECURITY VULNERABILITY FOR STEP 04: SECURITY
      const u = decodeURI(url).trim().toLowerCase();
      if (u.startsWith("javascript:")) {
        return "about:blank";
      }
      return url;
    }
    ```

4. Commit tus cambios de nuevo al branch escribiendo los siguientes comandos en su terminal:

   ```bash
   git add .
   git commit -m "Add security vulnerability"
   git push
   ```

Esta voluntad trigger la CodeQL workflow en tus pull request de nuevo.

### 2.3 - Verifique los resultados del escaneo de código

Después del CodeQL workflow ha terminado, navegar al pull request e inspeccionar los resultados.

1. Como se esperaba, ahora encontró la vulnerabilidad que acabamos de presentar.Rápidamente click on **Details** Para descubrir mas.

    ![Captura de pantalla de algunas comprobaciones de estado de un GitHub pull request con un escaneo de código fallido job](images/004/failed_codeql_run.png)

2. Esto nos traerá al **Checks** pestaña del pull request, informarnos que tenemos una vulnerabilidad de verificación de esquema de URL incompleta con alta gravedad. Click on **Details** de nuevo para aprender más.

    ![Captura de pantalla de un escaneo de códigojob página de resumen](images/004/codeql_workflow_summary.png)

3. Esto nos dirige al **Code scanning** pestaña debajo del repositorio **Security** pestaña.Aquí, encontramos todos los detalles de la vulnerabilidad que hemos descubierto: su ubicación en el código, una descripción del problema e incluso orientación sobre cómo solucionarla (after clicking on **Show more**).

    ![Captura de pantalla de la página de alerta de escaneo de código](images/004/vulnerability_result_page.png)

4. Bien, ¡entonces es hora de arreglar esto!Debe tener toda la información que necesita para abordar el problema por su cuenta.Sin embargo, si necesita una pista, puede hacer clic en el botón de abajo para revelar la solución.

   <details>
   <summary>
      Cómo arreglar la vulnerabilidad
   </summary>

   Modificar la línea 10 en el archivo [`src/components/OctoLink.tsx`](../src/components/OctoLink.tsx#10) A lo siguiente, luego cometa y presiona tus cambios:

   ```tsx
    if (u.startsWith("javascript:") || u.startsWith("data:") || u.startsWith("vbscript:")) {
      return "about:blank";
    }
   ```

   </details>

  Después de haber realizado los cambios y el CodeQL workflow runs again, La vulnerabilidad se resolverá y se deben pasar todas las verificaciones de la solicitud de extracción.

   ![Screenshot of a successful check of CodeQL in a pull request](images/004/code_scanning_success.png)



