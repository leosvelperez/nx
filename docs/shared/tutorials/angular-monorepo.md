---
title: 'Angular Monorepo Tutorial'
description: In this tutorial you'll create a frontend-focused workspace with Nx.
---

# Building Angular Apps in an Nx Monorepo

In this tutorial you'll learn how to use Angular with Nx in a monorepo setup.

What will you learn?

- how to create a new Angular application
- how to run a single task (i.e. serve your app) or run multiple tasks in parallel
- how to leverage code generators to scaffold components
- how to modularize your codebase and impose architectural constraints for better maintainability
- [how to speed up CI with Nx Cloud ⚡](#fast-ci)

## Nx CLI vs. Angular CLI

Nx evolved from being an extension of the Angular CLI to a [fully standalone CLI working with multiple frameworks](/getting-started/intro#start-small-extend-as-you-grow). As a result, adopting Nx as an Angular user is relatively straightforward. Your existing code, including builders and schematics, will still work as before, but you'll also have access to all the benefits Nx offers.

Advantages of Nx over the Angular CLI:

- [Cache any target](/features/cache-task-results)
- [Run only tasks affected by a code change](/ci/features/affected)
- [Split a large angular.json into multiple project.json files](/technologies/angular/recipes/nx-and-angular#projectjson-vs-angularjson)
- [Integrate with modern tools](/technologies/angular/recipes/nx-and-angular#integrating-with-modern-tools)
- [Controllable update process](/technologies/angular/recipes/nx-and-angular#ng-update-vs-nx-migrate)

Visit our ["Nx and the Angular CLI" page](/technologies/angular/recipes/nx-and-angular) for more details.

## Final Code

Here's the source code of the final result for this tutorial.

{% github-repository url="https://github.com/nrwl/nx-recipes/tree/main/angular-monorepo" /%}

<!-- {% stackblitz-button url="github.com/nrwl/nx-recipes/tree/main/angular-standalone?file=README.md" /%} -->

{% youtube
src="https://www.youtube.com/embed/ZzTP4bVJEnI"
title="Nx Angular Monorepo Tutorial Walkthrough"
/%}

## Creating a new Angular Monorepo

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=90" /%}

Create a new Angular monorepo with the following command:

```{% command="npx create-nx-workspace@latest angular-monorepo --preset=angular-monorepo" path="~" %}

NX   Let's create a new workspace [https://nx.dev/getting-started/intro]

✔ Application name · angular-store
✔ Which bundler would you like to use? · esbuild
✔ Default stylesheet format · css
✔ Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? · No
✔ Test runner to use for end to end (E2E) tests · cypress
✔ Which CI provider would you like to use? · github
```

Let's name the initial application `angular-store`. In this tutorial we're going to use `cypress` for e2e tests and `css` for styling. We'll talk more about how Nx integrates with GitHub Actions later in the tutorial. The above command generates the following structure:

```
└─ angular-monorepo
   ├─ ...
   ├─ apps
   │  ├─ angular-store
   │  │  ├─ src
   │  │  │  ├─ app
   │  │  │  │  ├─ app.css
   │  │  │  │  ├─ app.html
   │  │  │  │  ├─ app.spec.ts
   │  │  │  │  ├─ app.ts
   │  │  │  │  ├─ app.config.ts
   │  │  │  │  ├─ app.routes.ts
   │  │  │  │  └─ nx-welcome.ts
   │  │  │  ├─ assets
   │  │  │  ├─ index.html
   │  │  │  ├─ main.ts
   │  │  │  ├─ styles.css
   │  │  │  └─ test-setup.ts
   │  │  ├─ eslintrc.json
   │  │  ├─ jest.config.ts
   │  │  ├─ project.json
   │  │  ├─ tsconfig.app.json
   │  │  ├─ tsconfig.json
   │  │  └─ tsconfig.spec.json
   │  └─ angular-store-e2e
   │     └─ ...
   ├─ nx.json
   ├─ tsconfig.base.json
   └─ package.json
```

The setup includes:

- a new Angular application (`apps/angular-store/`)
- a Cypress based set of e2e tests (`apps/angular-store-e2e/`)
- Prettier preconfigured
- ESLint preconfigured
- Jest preconfigured

One way to structure an Nx monorepo is to place application projects in the `apps` folder and library projects in the `libs` folder. Applications are encouraged to be as light-weight as possible so that more code is pushed into libraries and can be reused in other projects. This folder structure is just a suggestion and can be modified to suit your organization's needs.

The [`nx.json` file](/reference/nx-json) contains configuration settings for Nx itself and global default settings that individual projects inherit. The `apps/angular-store/project.json` file contains [settings that are specific to the `angular-store` project](/reference/project-configuration). We'll examine that file more in the next section.

## Serving the App

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=138" /%}

To serve your new Angular application, just run:

```shell
cd angular-monorepo
npx nx serve angular-store
```

Your application should be served at [http://localhost:4200](http://localhost:4200).

Nx uses the following syntax to run tasks:

![Syntax for Running Tasks in Nx](/shared/images/run-target-syntax.svg)

### Manually Defined Tasks

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=160" /%}

The project tasks are defined in the `project.json` file.

```json {% fileName="apps/angular-store/project.json" %}
{
  "name": "angular-store",
  ...
  "targets": {
    "build": { ... },
    "serve": { ... },
    "extract-i18n": { ... },
    "lint": { ... },
    "test": { ... },
    "serve-static": { ... },
  },
}
```

Each target contains a configuration object that tells Nx how to run that target.

```json {% fileName="project.json" %}
{
  "name": "angular-store",
  ...
  "targets": {
    "serve": {
      "executor": "@angular/build:dev-server",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "angular-store:build"
      },
      "configurations": {
        "development": {
          "buildTarget": "angular-store:build:development",
          "hmr": true
        },
        "production": {
          "buildTarget": "angular-store:build:production",
          "hmr": false
        }
      }
     },
     ...
  },
}
```

The most critical parts are:

- `executor` - this is of the syntax `<plugin>:<executor-name>`, where the `plugin` is an NPM package containing an [Nx Plugin](/extending-nx/intro/getting-started) and `<executor-name>` points to a function that runs the task.
- `options` - these are additional properties and flags passed to the executor function to customize it

Learn more about how to [run tasks with Nx](/features/run-tasks). We'll [revisit running tasks](#testing-and-linting) later in this tutorial.

## Adding Another Application

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=182" /%}

Nx plugins usually provide [generators](/features/generate-code) that allow you to easily scaffold code, configuration or entire projects. To see what capabilities the `@nx/angular` plugin provides, run the following command and inspect the output:

```{% command="npx nx list @nx/angular" path="angular-monorepo" %}

NX   Capabilities in @nx/angular:

   GENERATORS

   add-linting : Adds linting configuration to an Angular project.
   application : Creates an Angular application.
   component : Generate an Angular Component.
   component-story : Creates a stories.ts file for a component.
   component-test : Creates a cypress component test file for a component.
   convert-tslint-to-eslint : Converts a project from TSLint to ESLint.
   init : Initializes the `@nx/angular` plugin.
   library : Creates an Angular library.
   library-secondary-entry-point : Creates a secondary entry point for an Angular publishable library.
   remote : Generate a Remote Angular Module Federation Application.
   move : Moves an Angular application or library to another folder within the workspace and updates the project configuration.
   // etc...

   EXECUTORS/BUILDERS

   delegate-build : Delegates the build to a different target while supporting incremental builds.
   ng-packagr-lite : Builds a library with support for incremental builds.
This executor is meant to be used with buildable libraries in an incremental build scenario. It is similar to the `@nx/angular:package` executor but with some key differences:
- It doesn't run `ngcc` automatically (`ngcc` needs to be run separately beforehand if needed, this can be done in a `postinstall` hook on `package.json`).
- It only produces ESM2020 bundles.
- It doesn't generate package exports in the `package.json`.
   package : Builds and packages an Angular library producing an output following the Angular Package Format (APF) to be distributed as an NPM package.
This executor is similar to the `@angular-devkit/build-angular:ng-packagr` with additional support for incremental builds.
   // etc...
```

{% callout type="info" title="Prefer a more visual UI?" %}

If you prefer a more integrated experience, you can install the "Nx Console" extension for your code editor. It has support for VSCode, IntelliJ and ships a LSP for Vim. Nx Console provides autocompletion support in Nx configuration files and has UIs for browsing and running generators.

More info can be found in [the integrate with editors article](/getting-started/editor-setup).

{% /callout %}

Run the following command to generate a new `inventory` application. Note how we append `--dry-run` to first check the output. We'll also use `--port=4201` to ensure the app runs on a different port than the default 4200.

```{% command="npx nx g @nx/angular:app apps/inventory --port=4201 --dry-run" path="angular-monorepo" %}
NX  Generating @nx/angular:application

✔ Would you like to configure routing for this application? (y/N) · false
✔ Would you like to use Standalone Components? (y/N) · true
CREATE apps/inventory/project.json
CREATE apps/inventory/src/assets/.gitkeep
CREATE apps/inventory/src/favicon.ico
CREATE apps/inventory/src/index.html
CREATE apps/inventory/src/styles.css
CREATE apps/inventory/tsconfig.app.json
CREATE apps/inventory/tsconfig.json
CREATE apps/inventory/src/app/app.css
CREATE apps/inventory/src/app/app.html
CREATE apps/inventory/src/app/app.spec.ts
CREATE apps/inventory/src/app/app.ts
CREATE apps/inventory/src/app/app.config.ts
CREATE apps/inventory/src/app/nx-welcome.ts
CREATE apps/inventory/src/main.ts
CREATE apps/inventory/.eslintrc.json
CREATE apps/inventory/jest.config.ts
CREATE apps/inventory/src/test-setup.ts
CREATE apps/inventory/tsconfig.spec.json
CREATE apps/inventory-e2e/cypress.config.ts
CREATE apps/inventory-e2e/src/e2e/app.cy.ts
CREATE apps/inventory-e2e/src/fixtures/example.json
CREATE apps/inventory-e2e/src/support/app.po.ts
CREATE apps/inventory-e2e/src/support/commands.ts
CREATE apps/inventory-e2e/src/support/e2e.ts
CREATE apps/inventory-e2e/tsconfig.json
CREATE apps/inventory-e2e/project.json
CREATE apps/inventory-e2e/.eslintrc.json

NOTE: The "dryRun" flag means no changes were made.
```

As you can see, it generates a new application in the `apps/inventory/` folder. Let's actually run the generator by removing the `--dry-run` flag.

```shell
npx nx g @nx/angular:app apps/inventory --port=4201
```

## Sharing Code with Local Libraries

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=232" /%}

When you develop your Angular application, usually all your logic sits in the `app` folder. Ideally separated by various folder names which represent your "domains". As your app grows, however, the app becomes more and more monolithic and the code is unable to be shared with other applications.

```
└─ angular-monorepo
   ├─ ...
   ├─ apps
   │  └─ angular-store
   │     ├─ ...
   │     ├─ src
   │     │  ├─ app
   │     │  │  ├─ products
   │     │  │  ├─ cart
   │     │  │  ├─ ui
   │     │  │  ├─ ...
   │     │  │  └─ app.ts
   │     │  ├─ ...
   │     │  └─ main.ts
   │     ├─ ...
   │     └─ project.json
   ├─ nx.json
   ├─ ...
```

Nx allows you to separate this logic into "local libraries". The main benefits include

- better separation of concerns
- better reusability
- more explicit "APIs" between your "domain areas"
- better scalability in CI by enabling independent test/lint/build commands for each library
- better scalability in your teams by allowing different teams to work on separate libraries

### Creating Local Libraries

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=254" /%}

Let's assume our domain areas include `products`, `orders` and some more generic design system components, called `ui`. We can generate a new library for each of these areas using the Angular library generator:

```
npx nx g @nx/angular:library libs/products
npx nx g @nx/angular:library libs/orders
npx nx g @nx/angular:library libs/shared/ui
```

Note how we type out the full path in the `directory` flag to place the libraries into a subfolder. You can choose whatever folder structure you like to organize your projects. If you change your mind later, you can run the [move generator](/reference/core-api/workspace/generators/move) to move a project to a different folder.

Running the above commands should lead to the following directory structure:

```
└─ angular-monorepo
   ├─ ...
   ├─ apps
   ├─ libs
   │  ├─ products
   │  │  ├─ ...
   │  │  ├─ project.json
   │  │  ├─ src
   │  │  │  ├─ index.ts
   │  │  │  ├─ test-setup.ts
   │  │  │  └─ lib
   │  │  │     └─ products
   │  │  ├─ tsconfig.json
   │  │  ├─ tsconfig.lib.json
   │  │  └─ tsconfig.spec.json
   │  ├─ orders
   │  │  ├─ ...
   │  │  ├─ project.json
   │  │  ├─ src
   │  │  │  ├─ index.ts
   │  │  │  └─ ...
   │  │  └─ ...
   │  └─ shared
   │     └─ ui
   │        ├─ ...
   │        ├─ project.json
   │        ├─ src
   │        │  ├─ index.ts
   │        │  └─ ...
   │        └─ ...
   ├─ ...
```

Each of these libraries

- has its own `project.json` file with corresponding targets you can run (e.g. running tests for just orders: `npx nx test orders`)
- has the name you specified in the generate command; you can find the name in the corresponding `project.json` file
- has a dedicated `index.ts` file which is the "public API" of the library
- is mapped in the `tsconfig.base.json` at the root of the workspace

### Importing Libraries into the Angular Applications

<!-- {% video-link link="https://youtu.be/ZzTP4bVJEnI?t=1245" /%} -->

All libraries that we generate automatically have aliases created in the root-level `tsconfig.base.json`.

```json {% fileName="tsconfig.base.json" %}
{
  "compilerOptions": {
    ...
    "paths": {
      "@angular-monorepo/orders": ["libs/orders/src/index.ts"],
      "@angular-monorepo/products": ["libs/products/src/index.ts"],
      "@angular-monorepo/shared-ui": ["libs/shared/ui/src/index.ts"]
    },
    ...
  },
}
```

Hence we can easily import them into other libraries and our Angular application. As an example, let's use the pre-generated `Products` component from our `libs/products` library.

You can see that the `Products` is exported via the `index.ts` file of our `products` library so that other projects in the repository can use it. This is our public API with the rest of the workspace. Only export what's really necessary to be usable outside the library itself.

```ts {% fileName="libs/products/src/index.ts" %}
export * from './lib/products/products';
```

We're ready to import it into our main application now. First (if you haven't already), let's set up the Angular router. Configure it in the `app.config.ts`.

```ts {% fileName="apps/angular-store/src/app/app.config.ts" highlightLines=[6,7,13] %}
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
  ],
};
```

And in `app.html`:

```ts {% fileName="apps/angular-store/src/app/app.html" %}
<router-outlet></router-outlet>
```

Then we can add the `Products` component to our `app.routes.ts` and render it via the routing mechanism whenever a user hits the `/products` route.

```ts {% fileName="apps/angular-store/src/app/app.routes.ts" highlightLines=[10,11,12,13,14] %}
import { Route } from '@angular/router';
import { NxWelcome } from './nx-welcome';

export const appRoutes: Route[] = [
  {
    path: '',
    component: NxWelcome,
    pathMatch: 'full',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('@angular-monorepo/products').then((m) => m.Products),
  },
];
```

Serving your app (`npx nx serve angular-store`) and then navigating to `/products` should give you the following result:

![products route](/shared/tutorials/app-products-route.png)

Let's apply the same for our `orders` library.

- import the `Orders` from `libs/orders` into the `app.routes.ts` and render it via the routing mechanism whenever a user hits the `/orders` route

In the end, your `app.routes.ts` should look similar to this:

```ts {% fileName="apps/angular-store/src/app/app.routes.ts" highlightLines=[15,16,17,18,19] %}
import { Route } from '@angular/router';
import { NxWelcome } from './nx-welcome';

export const appRoutes: Route[] = [
  {
    path: '',
    component: NxWelcome,
    pathMatch: 'full',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('@angular-monorepo/products').then((m) => m.Products),
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('@angular-monorepo/orders').then((m) => m.Orders),
  },
];
```

Let's also show products in the `inventory` app.

```ts {% fileName="apps/inventory/src/app/app.ts" highlightLines=[2,5] %}
import { Component } from '@angular/core';
import { Products } from '@angular-monorepo/products';

@Component({
  imports: [Products],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'inventory';
}
```

```ts {% fileName="apps/inventory/src/app/app.html" %}
<lib-products></lib-products>
```

## Visualizing your Project Structure

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=364" /%}

Nx automatically detects the dependencies between the various parts of your workspace and builds a [project graph](/features/explore-graph). This graph is used by Nx to perform various optimizations such as determining the correct order of execution when running tasks like `npx nx build`, identifying [affected projects](/features/run-tasks#run-tasks-on-projects-affected-by-a-pr) and more. Interestingly you can also visualize it.

Just run:

```shell
npx nx graph
```

You should be able to see something similar to the following in your browser.

{% graph height="450px" %}

```json
{
  "projects": [
    {
      "name": "angular-store",
      "type": "app",
      "data": {
        "tags": []
      }
    },
    {
      "name": "angular-store-e2e",
      "type": "e2e",
      "data": {
        "tags": []
      }
    },
    {
      "name": "inventory",
      "type": "app",
      "data": {
        "tags": []
      }
    },
    {
      "name": "inventory-e2e",
      "type": "e2e",
      "data": {
        "tags": []
      }
    },
    {
      "name": "shared-ui",
      "type": "lib",
      "data": {
        "tags": []
      }
    },
    {
      "name": "orders",
      "type": "lib",
      "data": {
        "tags": []
      }
    },

    {
      "name": "products",
      "type": "lib",
      "data": {
        "tags": []
      }
    }
  ],
  "dependencies": {
    "angular-store": [
      { "source": "angular-store", "target": "orders", "type": "static" },
      { "source": "angular-store", "target": "products", "type": "static" }
    ],
    "angular-store-e2e": [
      {
        "source": "angular-store-e2e",
        "target": "angular-store",
        "type": "implicit"
      }
    ],
    "inventory": [
      { "source": "inventory", "target": "products", "type": "static" }
    ],
    "inventory-e2e": [
      { "source": "inventory-e2e", "target": "inventory", "type": "implicit" }
    ],
    "shared-ui": [],
    "orders": [],
    "products": []
  },
  "workspaceLayout": { "appsDir": "", "libsDir": "" },
  "affectedProjectIds": [],
  "focus": null,
  "groupByFolder": false
}
```

{% /graph %}

Notice how `shared-ui` is not yet connected to anything because we didn't import it in any of our projects.

Exercise for you: change the codebase such that `shared-ui` is used by `orders` and `products`. Note: you need to restart the `npx nx graph` command to update the graph visualization or run the CLI command with the `--watch` flag.

## Testing and Linting

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=410" /%}

Our current setup not only has targets for serving and building the Angular application, but also has targets for unit testing, e2e testing and linting. The `test` and `lint` targets are defined in the application `project.json` file, while the `e2e` target is [inferred from the `apps/angular-store-e2e/cypress.config.ts` file](#inferred-tasks). We can use the same syntax as before to run these tasks:

```bash
npx nx test angular-store # runs the tests for angular-store
npx nx lint inventory # runs the linter on inventory
npx nx e2e angular-store-e2e # runs e2e tests for the angular-store
```

### Inferred Tasks

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=424" /%}

Nx identifies available tasks for your project from [tooling configuration files](/concepts/inferred-tasks), `package.json` scripts and the targets defined in `project.json`. All tasks from the `angular-store` project are defined in its `project.json` file, but the companion `angular-store-e2e` project has its tasks inferred from configuration files. To view the tasks that Nx has detected, look in the [Nx Console](/getting-started/editor-setup), [Project Details View](/recipes/nx-console/console-project-details) or run:

```shell
npx nx show project angular-store-e2e --web
```

{% project-details title="Project Details View" %}

```json
{
  "project": {
    "name": "angular-store-e2e",
    "type": "e2e",
    "data": {
      "metadata": {
        "targetGroups": {
          "E2E (CI)": ["e2e-ci--src/e2e/app.cy.ts", "e2e-ci"]
        }
      },
      "name": "angular-store-e2e",
      "root": "apps/angular-store-e2e",
      "sourceRoot": "apps/angular-store-e2e/src",
      "projectType": "application",
      "tags": [],
      "implicitDependencies": ["angular-store"],
      "targets": {
        "e2e": {
          "options": {
            "cwd": "apps/angular-store-e2e",
            "command": "cypress run"
          },
          "cache": true,
          "inputs": [
            "default",
            "^production",
            {
              "externalDependencies": ["cypress"]
            }
          ],
          "outputs": [
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/videos",
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/screenshots"
          ],
          "configurations": {
            "production": {
              "command": "cypress run --env webServerCommand=\"nx run angular-store:serve:production\""
            }
          },
          "executor": "nx:run-commands",
          "metadata": {
            "technologies": ["cypress"]
          }
        },
        "e2e-ci--src/e2e/app.cy.ts": {
          "outputs": [
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/videos",
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/screenshots"
          ],
          "inputs": [
            "default",
            "^production",
            {
              "externalDependencies": ["cypress"]
            }
          ],
          "cache": true,
          "options": {
            "cwd": "apps/angular-store-e2e",
            "command": "cypress run --env webServerCommand=\"nx run angular-store:serve-static\" --spec src/e2e/app.cy.ts"
          },
          "executor": "nx:run-commands",
          "configurations": {},
          "metadata": {
            "technologies": ["cypress"]
          }
        },
        "e2e-ci": {
          "executor": "nx:noop",
          "cache": true,
          "inputs": [
            "default",
            "^production",
            {
              "externalDependencies": ["cypress"]
            }
          ],
          "outputs": [
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/videos",
            "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/screenshots"
          ],
          "dependsOn": [
            {
              "target": "e2e-ci--src/e2e/app.cy.ts",
              "projects": "self",
              "params": "forward"
            }
          ],
          "options": {},
          "configurations": {},
          "metadata": {
            "technologies": ["cypress"]
          }
        },
        "lint": {
          "cache": true,
          "options": {
            "cwd": "apps/angular-store-e2e",
            "command": "eslint ."
          },
          "inputs": [
            "default",
            "{workspaceRoot}/.eslintrc.json",
            "{workspaceRoot}/apps/angular-store-e2e/.eslintrc.json",
            "{workspaceRoot}/tools/eslint-rules/**/*",
            {
              "externalDependencies": ["eslint"]
            }
          ],
          "executor": "nx:run-commands",
          "configurations": {},
          "metadata": {
            "technologies": ["eslint"]
          }
        }
      }
    }
  },
  "sourceMap": {
    "targets": ["apps/angular-store-e2e/project.json", "nx/core/project-json"],
    "targets.e2e": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e.cache": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e.inputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e.outputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e.options": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e.configurations": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci--src/e2e/app.cy.ts": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci--src/e2e/app.cy.ts.cache": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci--src/e2e/app.cy.ts.inputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci--src/e2e/app.cy.ts.outputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci--src/e2e/app.cy.ts.options": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci.cache": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci.dependsOn": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci.inputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci.outputs": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.e2e-ci.executor": [
      "apps/angular-store-e2e/cypress.config.ts",
      "@nx/cypress/plugin"
    ],
    "targets.lint": [
      "apps/angular-store-e2e/project.json",
      "@nx/eslint/plugin"
    ],
    "targets.lint.cache": [
      "apps/angular-store-e2e/project.json",
      "@nx/eslint/plugin"
    ],
    "targets.lint.inputs": [
      "apps/angular-store-e2e/project.json",
      "@nx/eslint/plugin"
    ],
    "targets.lint.options": [
      "apps/angular-store-e2e/project.json",
      "@nx/eslint/plugin"
    ]
  }
}
```

{% /project-details %}

If you expand the `e2e` task, you can see that it was created by the `@nx/cypress` plugin by analyzing the `apps/angular-store-e2e/cypress.config.ts` file. Notice the outputs are defined as:

```json
[
  [
    "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/videos",
    "{workspaceRoot}/dist/cypress/apps/angular-store-e2e/screenshots"
  ]
]
```

This value is being read from the `videosFolder` and `screenshotsFolder` defined by the `nxE2EPreset` in your `apps/angular-store-e2e/cypress.config.ts` file. Let's change their value in your `apps/angular-store-e2e/cypress.config.ts` file:

```ts {% fileName="apps/angular-store-e2e/cypress.config.ts" highlightLines=["8-10"] %}
// ...
export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      // ...
    }),
    baseUrl: 'http://localhost:4200',
    videosFolder: '../dist/cypress/apps/angular-store-e2e/videos-changed',
    screenshotsFolder:
      '../dist/cypress/apps/angular-store-e2e/screenshots-changed',
  },
});
```

Now if you look at the project details view again, the outputs for the `e2e` target will be:

```json
[
  "{workspaceRoot}/apps/dist/cypress/apps/angular-store-e2e/videos-changed",
  "{workspaceRoot}/apps/dist/cypress/apps/angular-store-e2e/screenshots-changed"
]
```

This feature ensures that Nx will always cache the correct files.

You can also override the settings for inferred tasks by modifying the [`targetDefaults` in `nx.json`](/reference/nx-json#target-defaults) or setting a value in your [`project.json` file](/reference/project-configuration). Nx will merge the values from the inferred tasks with the values you define in `targetDefaults` and in your specific project's configuration.

### Running Multiple Tasks

In addition to running individual tasks, you can also run multiple tasks in parallel using the following syntax:

```shell
npx nx run-many -t test lint e2e
```

### Caching

One thing to highlight is that Nx is able to [cache the tasks you run](/features/cache-task-results).

Note that all of these targets are automatically cached by Nx. If you re-run a single one or all of them again, you'll see that the task completes immediately. In addition, (as can be seen in the output example below) there will be a note that a matching cache result was found and therefore the task was not run again.

```{% command="npx nx run-many -t test lint e2e" path="angular-monorepo" %}
✔  nx run e2e:lint  [existing outputs match the cache, left as is]
✔  nx run angular-store:lint  [existing outputs match the cache, left as is]
✔  nx run angular-store:test  [existing outputs match the cache, left as is]
✔  nx run e2e:e2e  [existing outputs match the cache, left as is]

——————————————————————————————————————————————————————

NX   Successfully ran targets test, lint, e2e for 5 projects (54ms)

Nx read the output from the cache instead of running the command for 10 out of 10 tasks.
```

Not all tasks might be cacheable though. You can [configure which tasks are cacheable](/features/cache-task-results) in [the project configuration](/reference/project-configuration#cache) or in [the global Nx configuration](/reference/nx-json#cache). You can also [learn more about how caching works](/concepts/how-caching-works).

## Building the Apps for Deployment

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=608" /%}

If you're ready and want to ship your applications, you can build them using

```{% command="npx nx run-many -t build" path="angular-monorepo" %}
NX  Generating @nx/angular:component

CREATE libs/orders/src/lib/order-list/order-list.css
CREATE libs/orders/src/lib/order-list/order-list.html
CREATE libs/orders/src/lib/order-list/order-list.spec.ts
CREATE libs/orders/src/lib/order-list/order-list.ts
UPDATE libs/orders/src/index.ts
❯ nx run-many -t build

✔  nx run inventory:build:production (7s)
✔  nx run angular-store:build:production (7s)

———————————————————————————————————————————————————————————————————————

NX   Successfully ran target build for 2 projects (7s)
```

All the required files will be placed in `dist/apps/angular-store` and `dist/apps/inventory` and can be deployed to your favorite hosting provider.

You can even create your own `deploy` task that sends the build output to your hosting provider.

```json {% fileName="apps/angular-store/project.json" %}
{
  "targets": {
    "deploy": {
      "dependsOn": "build",
      "command": "netlify deploy --dir=dist/angular-store"
    }
  }
}
```

Replace the `command` with whatever terminal command you use to deploy your site.

The `"dependsOn": "build"` setting tells Nx to make sure that the project's `build` task has been run successfully before the `deploy` task.

With the `deploy` tasks defined, you can deploy a single application with `npx nx deploy angular-store` or deploy all applications with:

```shell
npx nx run-many -t deploy
```

## Fast CI ⚡ {% highlightColor="green" %}

{% callout type="check" title="Repository with Nx" %}
Make sure you have completed the previous sections of this tutorial before starting this one. If you want a clean starting point, you can check out the [reference code](https://github.com/nrwl/nx-recipes/tree/main/angular-monorepo) as a starting point.
{% /callout %}

{% video-link link="https://youtu.be/ZzTP4bVJEnI?t=791" /%}

This tutorial walked you through how Nx can improve the local development experience, but the biggest difference Nx makes is in CI. As repositories get bigger, making sure that the CI is fast, reliable and maintainable can get very challenging. Nx provides a solution.

- Nx reduces wasted time in CI with the [`affected` command](/ci/features/affected).
- Nx Replay's [remote caching](/ci/features/remote-cache) will reuse task artifacts from different CI executions making sure you will never run the same computation twice.
- Nx Agents [efficiently distribute tasks across machines](/ci/concepts/parallelization-distribution) ensuring constant CI time regardless of the repository size. The right number of machines is allocated for each PR to ensure good performance without wasting compute.
- Nx Atomizer [automatically splits](/ci/features/split-e2e-tasks) large e2e tests to distribute them across machines. Nx can also automatically [identify and rerun flaky e2e tests](/ci/features/flaky-tasks).

### Connect to Nx Cloud {% highlightColor="green" %}

Nx Cloud is a companion app for your CI system that provides remote caching, task distribution, e2e tests deflaking, better DX and more.

Now that we're working on the CI pipeline, it is important for your changes to be pushed to a GitHub repository.

1. Commit your existing changes with `git add . && git commit -am "updates"`
2. [Create a new GitHub repository](https://github.com/new)
3. Follow GitHub's instructions to push your existing code to the repository

When we set up the repository at the beginning of this tutorial, we chose to use GitHub Actions as a CI provider. This created a basic CI pipeline and configured Nx Cloud in the repository. It also printed a URL in the terminal to register your repository in your [Nx Cloud](https://cloud.nx.app) account. If you didn't click on the link when first creating your repository, you can show it again by running:

```shell
npx nx connect
```

Once you click the link, follow the steps provided and make sure Nx Cloud is enabled on the main branch of your repository.

### Configure Your CI Workflow {% highlightColor="green" %}

When you chose GitHub Actions as your CI provider at the beginning of the tutorial, `create-nx-workspace` created a `.github/workflows/ci.yml` file that contains a CI pipeline that will run the `lint`, `test`, `build` and `e2e` tasks. If you would like to also distribute tasks across multiple machines to ensure fast and reliable CI runs, uncomment the `nx-cloud start-ci-run` line and have the `nx run-many` line run the `e2e-ci` task instead of `e2e`.

If you need to generate a new workflow file for GitHub Actions or other providers, you can do so with this command:

```shell
npx nx generate ci-workflow --useRunMany
```

The key lines in the CI pipeline are:

```yml {% fileName=".github/workflows/ci.yml" highlightLines=["12-16", "24-26"] %}
name: CI
# ...
jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          filter: tree:0

      # This enables task distribution via Nx Cloud
      # Run this command as early as possible, before dependencies are installed
      # Learn more at https://nx.dev/ci/reference/nx-cloud-cli#npx-nxcloud-startcirun
      # Uncomment this line to enable task distribution
      # - run: npx nx-cloud start-ci-run --distribute-on="3 linux-medium-js" --stop-agents-after="e2e-ci"
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci --legacy-peer-deps
      # Prepend any command with "nx-cloud record --" to record its logs to Nx Cloud
      # - run: npx nx-cloud record -- echo Hello World
      # As your workspace grows, you can change this to use Nx Affected to run only tasks affected by the changes in this PR/commit. Learn more: https://nx.dev/ci/features/affected
      # When you enable task distribution, run the e2e-ci task instead of e2e
      - run: npx nx run-many -t lint test build e2e
      # Nx Cloud recommends fixes for failures to help you get CI green faster. Learn more: https://nx.dev/ci/features/self-healing-ci
      - run: npx nx fix-ci
        if: always()
```

### Open a Pull Request {% highlightColor="green" %}

Commit the changes and open a new PR on GitHub.

```shell
git add .
git commit -m 'add CI workflow file'
git push origin add-workflow
```

When you view the PR on GitHub, you will see a comment from Nx Cloud that reports on the status of the CI run.

![Nx Cloud report](/shared/tutorials/github-pr-cloud-report.avif)

The `See all runs` link goes to a page with the progress and results of tasks that were run in the CI pipeline.

![Run details](/shared/tutorials/nx-cloud-run-details.avif)

For more information about how Nx can improve your CI pipeline, check out one of these detailed tutorials:

- [Circle CI with Nx](/ci/intro/tutorials/circle)
- [GitHub Actions with Nx](/ci/intro/tutorials/github-actions)

## Next Steps

Here's some things you can dive into next:

- Read more about [how Nx compares to the Angular CLI](/technologies/angular/recipes/nx-and-angular)
- Learn more about the [underlying mental model of Nx](/concepts/mental-model)
- Learn about popular generators such as [how to setup Tailwind](/technologies/angular/recipes/using-tailwind-css-with-angular-projects)
- Learn how to [migrate your existing Angular CLI repo to Nx](technologies/angular/migration/angular)
- Learn about [enforcing boundaries between projects](/features/enforce-module-boundaries)
- [Setup Storybook for our shared UI library](/technologies/test-tools/storybook/recipes/overview-angular)

Also, make sure you

- ⭐️ [Star us on GitHub](https://github.com/nrwl/nx) to show your support and stay updated on new releases!
- [Join the Official Nx Discord Server](https://go.nx.dev/community) to ask questions and find out the latest news about Nx.
- [Follow Nx on Twitter](https://twitter.com/nxdevtools) to stay up to date with Nx news
- [Read our Nx blog](/blog)
- [Subscribe to our Youtube channel](https://www.youtube.com/@nxdevtools) for demos and Nx insights
