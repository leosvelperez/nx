import { formatFiles, getProjects, runTasksInSerial, Tree } from '@nx/devkit';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';
import { E2eTestRunner } from '../../utils/test-runners';
import { applicationGenerator } from '../application/application';
import { setupMf } from '../setup-mf/setup-mf';
import { addSsr, findNextAvailablePort } from './lib';
import type { Schema } from './schema';

export async function remote(tree: Tree, options: Schema) {
  return await remoteInternal(tree, {
    projectNameAndRootFormat: 'derived',
    ...options,
  });
}

export async function remoteInternal(tree: Tree, schema: Schema) {
  const { typescriptConfiguration = true, ...options }: Schema = schema;

  const projects = getProjects(tree);
  if (options.host && !projects.has(options.host)) {
    throw new Error(
      `The name of the application to be used as the host app does not exist. (${options.host})`
    );
  }

  const { projectName: remoteProjectName, projectNameAndRootFormat } =
    await determineProjectNameAndRootOptions(tree, {
      name: options.name,
      projectType: 'application',
      directory: options.directory,
      projectNameAndRootFormat: options.projectNameAndRootFormat,
      callingGenerator: '@nx/angular:remote',
    });
  options.projectNameAndRootFormat = projectNameAndRootFormat;

  const port = options.port ?? findNextAvailablePort(tree);

  const appInstallTask = await applicationGenerator(tree, {
    ...options,
    standalone: options.standalone ?? false,
    routing: true,
    port,
    skipFormat: true,
  });

  const skipE2E =
    !options.e2eTestRunner || options.e2eTestRunner === E2eTestRunner.None;

  await setupMf(tree, {
    appName: remoteProjectName,
    mfType: 'remote',
    routing: true,
    host: options.host,
    port,
    skipPackageJson: options.skipPackageJson,
    skipFormat: true,
    skipE2E,
    e2eProjectName: skipE2E ? undefined : `${remoteProjectName}-e2e`,
    standalone: options.standalone,
    prefix: options.prefix,
    typescriptConfiguration,
  });

  let installTasks = [appInstallTask];
  if (options.ssr) {
    let ssrInstallTask = await addSsr(tree, {
      appName: remoteProjectName,
      port,
      typescriptConfiguration,
      standalone: options.standalone,
    });
    installTasks.push(ssrInstallTask);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...installTasks);
}

export default remote;
