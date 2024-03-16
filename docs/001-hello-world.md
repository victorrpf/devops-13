# Parte 1 - Hello World

GitHub Actions es una plataforma continua de integración e implementación continua (CI/CD) que le permite automatizar su construcción, prueba e implementación de tuberías. Le brinda la capacidad de crear Workflow que creen y prueben cada solicitud de extracción a su repositorio, y luego implementa automáticamente las solicitudes de extracción de fusiones para la producción.

Las acciones de GitHub también sobrealimentan DevOps al permitirle ejecutar Workflow activados por una gran cantidad de eventos diferentes en su repositorio. Como ejemplo, puede construir un Workflow que agrega automáticamente las etiquetas apropiadas (por ejemplo, "bug" o "triage") cada vez que alguien crea un nuevo issue en su repositorio.

GitHub proporciona máquinas virtuales de Linux, Windows y MacOS para ejecutar sus Workflow, o puede alojar sus propios runners en su propio centro de datos o cloud.

**The components of GitHub Actions**

Las acciones de trabajo de GitHub siempre se desencadenan por eventos que ocurren en su repositorio, como una solicitud de extracción o se está creando un problema. Un Workflow contiene uno o más trabajos que pueden ejecutarse en orden secuencial o en paralelo. Cada trabajo se ejecutará dentro de su propio corredor de máquina virtual, o dentro de un contenedor, y tiene uno o más pasos.Cada paso ejecuta un script de shell o una acción, que es una extensión reutilizable que automatiza una cierta pieza de su Workflow.

![](https://docs.github.com/assets/cb-25628/images/help/images/overview-actions-simple.png)

Puedes obtener la documentacion oficial en  [GitHub Actions and workflows components](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions#the-components-of-github-actions)

## 1 - Implemente su primer Workflow con acciones de GitHub

### 1.1 - Crea un Workflow de "hola mundo"

¡Creemos nuestro primer Workflow de GitHub Actions!

1. En su repositorio, haga clic en la pestaña **Actions**. Se le ofrecerá una lista de sugerencias de Workflow. Sin embargo, para su primer Workflow, debe hacer clic en el enlace **Configuración de un Workflow** en la parte superior de la página.

  ![Screenshot depicting the initial actions tab](./images/001/setup_new_workflow.png)

2. Esto lo traerá automáticamente al editor de acción de Github Web GUI, que le solicita que cree un nuevo archivo en su repositorio en `.github/workflows/main.yml`.Pegue el siguiente contenido en él:

    ```yml
    name: Hello World Innotech

    on:
      workflow_dispatch:

    jobs:
      greet:
        runs-on: ubuntu-latest
        steps:
          - name: Greet the User
            run: echo "Hello World!"
    ```

    ![Screenshot showing the Web GUI Editor, highlighting the Commit changes button](images/001/web_gui_editor.png)

3. Haga clic en `Commit Changes` y luego mergealo directamente con la rama `main`.

    ![Screenshot showing the commit dialog](images/001/commit_changes.png)

Cambie el nombre del archivo a `hello-world.yml`, haga clic en **Commit Changes** y mergea directamente con la rama 'main`.

### 1.2 - Ejecuta el workflow manualmente

El Workflow que creó se activa por el evento 'Workflow_dispatch`, lo que significa que se puede ejecutar manualmente:

```yml
on:
  ...
  # Permite ejecutar este Workflow manualmente desde la pestaña Acciones
  workflow_dispatch:
```
Puede ejecutar manualmente su Workflow navegando a la pestaña **Acciones**, seleccionando el Workflow deseado y haciendo clic en el botón **Ejecutar Workflow**:

<img width="1287" alt="image" src="https://user-images.githubusercontent.com/3329307/171651016-83f44a1c-471d-4b55-a71c-52b629f1bd5a.png">

Actualice la página o espere unos segundos para ver los resultados de su funcionamiento de Workflow.

<img width="1262" alt="image" src="https://user-images.githubusercontent.com/3329307/171655904-27e82818-8e23-4462-a024-6d443ee8241d.png">

Felicidades, acabas de ejecutar tu primer Workflow de GitHub Actions.🥳

> **Mas sobre workflow triggers**
>
> Para más información, ver [Configuring a workflow](https://docs.github.com/en/actions/using-workflows) y [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions).

## 1.3 -Analiza tu workflow

En la lista de ejecuciones de Workflow, haga clic en una de las ejecuciones para el Workflow "Hello World".Se le mostrará su trabajo en trabajos en el lado izquierdo de la página. Haga clic en ese trabajo para ver sus registros (puede ampliar los registros para un paso particular haciendo clic en él).

La vista de ejecución de Workflow también le permite volver a ejecutar trabajos en caso de que ocurran problemas (botón en la parte superior derecha). Además, volver a ejecutar un trabajo le permite habilitar [debug logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging).

## 2 - Usar un action

El uso de comandos BASH para automatizar los procesos es un requisito fundamental para cualquier sistema de CI/CD. Sin embargo, escribir scripts de shell puede volverse muy engorroso a medida que escala, y puede encontrarse reescribiendo la misma funcionalidad en diferentes proyectos.

Afortunadamente, las acciones de GitHub ofrecen una manera mucho mejor de manejar la automatización: ¡usando **actions**! Un action es una unidad pequeña, compuesta y reutilizable de código de automatización que puede integrarse fácilmente en todos sus Workflow.

### 2.1 - Añade una accion en tu workflow

Comencemos utilizando una de las acciones más básicas pero comúnmente utilizadas: la acción de 'actions/checkout`:

1. En su editor, navegue a la pestaña `Código`, luego a` .github/workflows/hello-world.yml`, y luego haga clic en el pequeño icono de lápiz en la esquina superior derecha para reabrir el editor.
2. Agregue los siguientes pasos al trabajo existente:

    ```yml
    steps:
      - name: Greet the User
        run: echo "Hello World!"
      # Enumere todos los archivos en el directorio actual para la comparación antes y después actions/checkout@v2.
      - run: ls -l
      - uses: actions/checkout@v2
      - run: ls -l
    ```

    Tenga en cuenta que, a diferencia de ejecutar comandos de shell, ejecutar una acción requiere el uso de la palabra clave `uses`.

3. Confirme los cambios y active una nueva ejecución de Workflow.

### 2.2 - Entendiendo el poder de los Actions

Si examina los registros de Workflow y compara la salida de los dos comandos `ls -l`, notará que el  `actions/checkout` La acción ha revisado la rama 'main` de nuestro repositorio. Se logró sin requerir que especifique cualquier comando 'Git Clone` shell o cualquier referencia o configuración.

Esto es sólo la punta del iceberg.Hay miles de acciones aún más sofisticadas disponibles para que pueda usar, lo que puede convertir las automatizaciones complejas en una cuestión de unas pocas líneas de configuración.Exploraremos muchos de estos a lo largo de este taller.

Si está ansioso por explorar todas las acciones existentes creadas no solo por Github sino también por toda la comunidad de código abierto, diríjase a la [GitHub Marketplace](https://github.com/marketplace?category=&query=&type=actions&verification=).

## 3 - Usar variables de entorno

Puede usar variables de entorno para agregar información a la que desea hacer referencia en sus Workflow.Algunas variables de entorno incluso están predefinidas para que usted los use de inmediato (por ejemplo, la persona que activó la ejecución actual del Workflow).Para utilizar estos, edite el Workflow "Hello World" y agregue las siguientes líneas:

1. Agregue una variable de entorno a nivel de trabajo:

    ```yml
        greet:
            env:
                MY_ENV: "John Doe"
    ```

2. Agregue un segundo paso para utilizar su variable de entorno y una predeterminada:

    ```yml
          - name: Run a multi-line script
            run: |
              echo "Hello $MY_ENV"
              echo "Hello $GITHUB_ACTOR"
    ```

<details>
<summary>Your workflow file (main.yml) should now look like this:</summary>

```yml
name: Hello World Training Workflow

on:
  workflow_dispatch:

jobs:
  greet:
    env:
      MY_ENV: "John Doe"
    runs-on: ubuntu-latest
    steps:
      - name: Greet the User
        run: echo "Hello World!"
      - name: Run a multi-line script
        run: |
          echo "Hello $MY_ENV"
          echo "Hello $GITHUB_ACTOR"
```

</details>

Comitea tus cambios y comience una nueva ejecución.Debería ver lo siguiente en los registros de ejecución (tenga en cuenta que el segundo `Hola` debería imprimir su propio nombre de usuario GitHub):

![Screenshot showing the logs of the step created above, showcasing that it printed the specified environment variable for $MY_ENV and the github-actor](https://user-images.githubusercontent.com/3329307/171652241-7b2f2eba-f5eb-4f3f-b529-dbf2198c65f7.png)

Obtenga más información sobre las variables de entorno y las variables predeterminadas, ver [the official GitHub documentation on Environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables).




## 4 - Hacer eventos adicionales a su workflow

GitHub Acciones Los Workflow pueden ser activados por muchos tipos diferentes de eventos:

- [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

Modificemos nuestro Workflow para que también se ejecute automáticamente cada vez que se crea un problema en nuestro repositorio. Esta práctica se conoce comúnmente como "IssueOps". Para lograr esto, agregue lo siguiente a la sección 'dentro' del archivo de Workflow y confirme los cambios:

```yml
...

on:
  workflow_dispatch:
  issues:
    types: [opened, edited]

...
```

Ahora crea una `issue` en su repositorio y verifique la pestaña `actions'.Deberías ver el Workflow ejecutado de la siguiente manera:

![image](https://user-images.githubusercontent.com/3329307/171652425-14a1ce9f-06c0-4b24-b937-7330c76c735f.png)


## EJERCICIO: Vamos a crear un nuevo workflow en el que tendremos  que parametrizar variables de entorno para que en el inicio del Workflow nos pida unas entradas que luego usaremos en el step. Se deberá utuilizar al menos tres parametros, choice, string y boolean  [Documentación](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputs)



