import type { Tree } from '@nx/devkit';
import {
  getProjects,
  normalizePath,
  readProjectConfiguration,
  stripIndents,
} from '@nx/devkit';
import { lt } from 'semver';
import { pathStartsWith } from './path';
import { getInstalledAngularVersionInfo } from './version-utils';

export function validateProject(tree: Tree, projectName: string): void {
  const projects = getProjects(tree);

  if (!projects.has(projectName)) {
    throw new Error(
      `Project "${projectName}" does not exist! Please provide an existing project name.`
    );
  }
}

export function validatePathIsUnderProjectRoot(
  tree: Tree,
  projectName: string,
  path: string
): void {
  if (!path) {
    return;
  }

  const { root } = readProjectConfiguration(tree, projectName);

  let pathToComponent = normalizePath(path);
  pathToComponent = pathToComponent.startsWith('/')
    ? pathToComponent.slice(1)
    : pathToComponent;

  if (!pathStartsWith(pathToComponent, root)) {
    throw new Error(
      `The path provided (${path}) does not exist under the project root (${root}). ` +
        `Please make sure to provide a path that exists under the project root.`
    );
  }
}
