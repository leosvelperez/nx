import {
  NxJsonConfiguration,
  readJson,
  readProjectConfiguration,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { PackageJson } from 'nx/src/utils/package-json';
import { backwardCompatibleVersions } from '../../utils/backward-compatible-versions';
import { angularVersion, ngUniversalVersion } from '../../utils/versions';
import { generateTestApplication } from '../utils/testing';
import { setupSsr } from './setup-ssr';

describe('setupSSR', () => {
  it('should create the files correctly for ssr', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: 'app1',
    });

    // ACT
    await setupSsr(tree, { project: 'app1' });

    // ASSERT
    expect(
      readProjectConfiguration(tree, 'app1').targets.server
    ).toMatchSnapshot();
    expect(tree.read('app1/server.ts', 'utf-8')).toMatchSnapshot();
    expect(tree.read('app1/src/main.server.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "export { AppServerModule } from './app/app.server.module';
      "
    `);
    expect(tree.read('app1/src/main.ts', 'utf-8')).toMatchInlineSnapshot(`
      "import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      platformBrowserDynamic()
        .bootstrapModule(AppModule)
        .catch((err) => console.error(err));
      "
    `);
    expect(tree.read('app1/tsconfig.server.json', 'utf-8'))
      .toMatchInlineSnapshot(`
      "/* To learn more about this file see: https://angular.io/config/tsconfig. */
      {
        "extends": "./tsconfig.app.json",
        "compilerOptions": {
          "outDir": "../../out-tsc/server",
          "target": "es2019",
          "types": ["node"]
        },
        "files": ["src/main.server.ts", "server.ts"]
      }
      "
    `);
    expect(tree.read('app1/src/app/app.server.module.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { ServerModule } from '@angular/platform-server';

      import { AppModule } from './app.module';
      import { AppComponent } from './app.component';

      @NgModule({
        imports: [AppModule, ServerModule],
        bootstrap: [AppComponent],
      })
      export class AppServerModule {}
      "
    `);
    expect(tree.read('app1/src/app/app.module.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { BrowserModule } from '@angular/platform-browser';
      import { RouterModule } from '@angular/router';
      import { AppComponent } from './app.component';
      import { appRoutes } from './app.routes';
      import { NxWelcomeComponent } from './nx-welcome.component';

      @NgModule({
        declarations: [AppComponent, NxWelcomeComponent],
        imports: [
          BrowserModule,
          RouterModule.forRoot(appRoutes, { initialNavigation: 'enabledBlocking' }),
        ],
        providers: [],
        bootstrap: [AppComponent],
      })
      export class AppModule {}
      "
    `);
    const packageJson = readJson<PackageJson>(tree, 'package.json');
    const dependencies = {
      '@nguniversal/express-engine': ngUniversalVersion,
      '@angular/platform-server': angularVersion,
    };
    for (const [dep, version] of Object.entries(dependencies)) {
      expect(packageJson.dependencies[dep]).toEqual(version);
    }
    const devDeps = {
      '@nguniversal/builders': ngUniversalVersion,
    };
    for (const [dep, version] of Object.entries(devDeps)) {
      expect(packageJson.devDependencies[dep]).toEqual(version);
    }
    const nxJson = readJson<NxJsonConfiguration>(tree, 'nx.json');
    expect(nxJson.tasksRunnerOptions).toMatchInlineSnapshot(`
      {
        "default": {
          "options": {
            "cacheableOperations": [
              "build",
              "lint",
              "test",
              "e2e",
              "server",
            ],
          },
          "runner": "nx/tasks-runners/default",
        },
      }
    `);
  });

  it('should use fileReplacements if they already exist', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: 'app1',
    });

    tree.write('app1/src/environments/environment.ts', '');
    tree.write('app1/src/environments/environment.prod.ts', '');
    const project = readProjectConfiguration(tree, 'app1');
    project.targets.build.configurations.production.fileReplacements = [
      {
        replace: 'app1/src/environments/environment.ts',
        with: 'app1/src/environments/environment.prod.ts',
      },
    ];
    updateProjectConfiguration(tree, 'app1', project);

    // ACT
    await setupSsr(tree, { project: 'app1' });

    // ASSERT
    expect(
      readProjectConfiguration(tree, 'app1').targets.server
    ).toMatchSnapshot();
  });

  it('should create the files correctly for ssr when app is standalone', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: 'app1',
      standalone: true,
    });

    // ACT
    await setupSsr(tree, { project: 'app1' });

    // ASSERT
    expect(
      readProjectConfiguration(tree, 'app1').targets.server
    ).toMatchSnapshot();
    expect(tree.read('app1/server.ts', 'utf-8')).toMatchSnapshot();
    expect(tree.read('app1/src/main.server.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { bootstrapApplication } from '@angular/platform-browser';
      import { AppComponent } from './app/app.component';
      import { config } from './app/app.config.server';

      const bootstrap = () => bootstrapApplication(AppComponent, config);

      export default bootstrap;
      "
    `);
    expect(tree.read('app1/tsconfig.server.json', 'utf-8'))
      .toMatchInlineSnapshot(`
      "/* To learn more about this file see: https://angular.io/config/tsconfig. */
      {
        "extends": "./tsconfig.app.json",
        "compilerOptions": {
          "outDir": "../../out-tsc/server",
          "target": "es2019",
          "types": ["node"]
        },
        "files": ["src/main.server.ts", "server.ts"]
      }
      "
    `);
    expect(tree.read('app1/src/app/app.config.server.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
      import { provideServerRendering } from '@angular/platform-server';
      import { appConfig } from './app.config';

      const serverConfig: ApplicationConfig = {
        providers: [provideServerRendering()],
      };

      export const config = mergeApplicationConfig(appConfig, serverConfig);
      "
    `);

    const packageJson = readJson<PackageJson>(tree, 'package.json');
    const dependencies = {
      '@nguniversal/express-engine': ngUniversalVersion,
      '@angular/platform-server': angularVersion,
    };
    for (const [dep, version] of Object.entries(dependencies)) {
      expect(packageJson.dependencies[dep]).toEqual(version);
    }
    const devDeps = {
      '@nguniversal/builders': ngUniversalVersion,
    };
    for (const [dep, version] of Object.entries(devDeps)) {
      expect(packageJson.devDependencies[dep]).toEqual(version);
    }
    const nxJson = readJson<NxJsonConfiguration>(tree, 'nx.json');
    expect(nxJson.tasksRunnerOptions).toMatchInlineSnapshot(`
      {
        "default": {
          "options": {
            "cacheableOperations": [
              "build",
              "lint",
              "test",
              "e2e",
              "server",
            ],
          },
          "runner": "nx/tasks-runners/default",
        },
      }
    `);
  });

  it('should add hydration correctly for NgModule apps', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: 'app1',
    });

    // ACT
    await setupSsr(tree, { project: 'app1', hydration: true });

    // ASSERT
    expect(tree.read('app1/src/app/app.module.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import {
        BrowserModule,
        provideClientHydration,
      } from '@angular/platform-browser';
      import { RouterModule } from '@angular/router';
      import { AppComponent } from './app.component';
      import { appRoutes } from './app.routes';
      import { NxWelcomeComponent } from './nx-welcome.component';

      @NgModule({
        declarations: [AppComponent, NxWelcomeComponent],
        imports: [
          BrowserModule,
          RouterModule.forRoot(appRoutes, { initialNavigation: 'enabledBlocking' }),
        ],
        providers: [provideClientHydration()],
        bootstrap: [AppComponent],
      })
      export class AppModule {}
      "
    `);
  });

  it('should add hydration correctly to standalone', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: 'app1',
      standalone: true,
    });

    // ACT
    await setupSsr(tree, { project: 'app1', hydration: true });

    // ASSERT
    expect(tree.read('app1/src/app/app.config.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { ApplicationConfig } from '@angular/core';
      import {
        provideRouter,
        withEnabledBlockingInitialNavigation,
      } from '@angular/router';
      import { appRoutes } from './app.routes';
      import { provideClientHydration } from '@angular/platform-browser';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideClientHydration(),
          provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
        ],
      };
      "
    `);

    expect(tree.read('app1/src/app/app.config.server.ts', 'utf-8'))
      .toMatchInlineSnapshot(`
      "import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
      import { provideServerRendering } from '@angular/platform-server';
      import { appConfig } from './app.config';

      const serverConfig: ApplicationConfig = {
        providers: [provideServerRendering()],
      };

      export const config = mergeApplicationConfig(appConfig, serverConfig);
      "
    `);
  });

  describe('compat', () => {
    it('should install the correct versions when using older versions of Angular', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

      await generateTestApplication(tree, {
        name: 'app1',
      });

      updateJson(tree, 'package.json', (json) => ({
        ...json,
        dependencies: {
          '@angular/core': '15.2.0',
        },
      }));

      // ACT
      await setupSsr(tree, { project: 'app1' });

      // ASSERT
      const pkgJson = readJson(tree, 'package.json');
      expect(pkgJson.dependencies['@angular/platform-server']).toEqual(
        backwardCompatibleVersions.angularV15.angularVersion
      );
      expect(pkgJson.dependencies['@nguniversal/express-engine']).toEqual(
        backwardCompatibleVersions.angularV15.ngUniversalVersion
      );
      expect(pkgJson.devDependencies['@nguniversal/builders']).toEqual(
        backwardCompatibleVersions.angularV15.ngUniversalVersion
      );
    });

    it('should add "withServerTransition" call to app module for angular versions lower than 16', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      updateJson(tree, 'package.json', (json) => ({
        ...json,
        dependencies: { ...json.dependencies, '@angular/core': '^15.2.0' },
      }));

      await generateTestApplication(tree, {
        name: 'app1',
      });

      // ACT
      await setupSsr(tree, { project: 'app1' });

      // ASSERT
      expect(tree.read('app1/src/app/app.module.ts', 'utf-8'))
        .toMatchInlineSnapshot(`
        "import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { RouterModule } from '@angular/router';
        import { AppComponent } from './app.component';
        import { appRoutes } from './app.routes';
        import { NxWelcomeComponent } from './nx-welcome.component';

        @NgModule({
          declarations: [AppComponent, NxWelcomeComponent],
          imports: [
            BrowserModule.withServerTransition({ appId: 'serverApp' }),
            RouterModule.forRoot(appRoutes, { initialNavigation: 'enabledBlocking' }),
          ],
          providers: [],
          bootstrap: [AppComponent],
        })
        export class AppModule {}
        "
      `);
    });

    it('should wrap bootstrap call for Angular versions lower than 15.2', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      await generateTestApplication(tree, {
        name: 'app1',
      });
      updateJson(tree, 'package.json', (json) => ({
        ...json,
        dependencies: { '@angular/core': '15.1.0' },
      }));

      // ACT
      await setupSsr(tree, { project: 'app1' });

      // ASSERT
      expect(tree.read('app1/src/main.ts', 'utf-8')).toMatchInlineSnapshot(`
              "import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
              import { AppModule } from './app/app.module';

              function bootstrap() {
                platformBrowserDynamic()
                  .bootstrapModule(AppModule)
                  .catch((err) => console.error(err));
              }

              if (document.readyState !== 'loading') {
                bootstrap();
              } else {
                document.addEventListener('DOMContentLoaded', bootstrap);
              }
              "
          `);
    });
  });
});
