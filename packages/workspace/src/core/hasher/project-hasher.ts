import {
  NxJsonConfiguration,
  ProjectGraph,
  readJsonFile,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { resolveNewFormatWithInlineProjects } from '@nrwl/tao/src/shared/workspace';
import { resolvePathFromRoot } from '../../utilities/fileutils';
import { workspaceFileName } from '../file-utils';
import { isWorkspaceProject } from '../project-graph';
import { HashingImpl } from './hashing-impl';
import { ImplicitDepsHasher } from './implicit-deps-hasher';

export interface ProjectHashResult {
  value: string;
  nodes: { [name: string]: string };
  implicitDeps: { [fileName: string]: string };
}

interface CompilerOptions {
  paths: Record<string, string[]>;
}

interface TsConfigJsonConfiguration {
  compilerOptions: CompilerOptions;
}

export class ProjectHasher {
  private sourceHashes: { [projectName: string]: Promise<string> } = {};
  private workspaceJson: WorkspaceJsonConfiguration;
  private nxJson: NxJsonConfiguration;
  private tsConfigJson: TsConfigJsonConfiguration;
  private nonWorkspaceProjectHash: string;

  constructor(
    private readonly projectGraph: ProjectGraph,
    private readonly hashing: HashingImpl,
    private readonly implicitDepsHasher: ImplicitDepsHasher,
    private readonly options: { selectivelyHashTsConfig: boolean }
  ) {
    this.workspaceJson = this.readWorkspaceConfigFile(
      resolvePathFromRoot(workspaceFileName())
    );
    this.nxJson = this.readNxJsonConfigFile(resolvePathFromRoot('nx.json'));
    this.tsConfigJson = this.readTsConfig();
    this.nonWorkspaceProjectHash = this.hashing.hashArray(['']);
  }

  async hashProject(
    projectName: string,
    visited: string[]
  ): Promise<ProjectHashResult> {
    if (isWorkspaceProject(this.projectGraph.nodes[projectName])) {
      return this.hashWorkspaceProject(projectName, visited);
    }

    return this.hashNonWorkspaceProject(projectName);
  }

  async hashProjectNodeSource(projectName: string) {
    if (!this.sourceHashes[projectName]) {
      this.sourceHashes[projectName] = new Promise(async (res) => {
        const p = this.projectGraph.nodes[projectName];
        const fileNames = p.data.files.map((f) => f.file);
        const values = p.data.files.map((f) => f.hash);

        const workspaceJson = JSON.stringify(
          this.workspaceJson.projects[projectName] ?? ''
        );
        const nxJson = JSON.stringify(this.nxJson.projects[projectName] ?? '');

        let tsConfig: string;
        if (this.options.selectivelyHashTsConfig) {
          tsConfig = this.removeOtherProjectsPathRecords(projectName);
        } else {
          tsConfig = JSON.stringify(this.tsConfigJson);
        }

        res(
          this.hashing.hashArray([
            ...fileNames,
            ...values,
            workspaceJson,
            nxJson,
            tsConfig,
          ])
        );
      });
    }
    return this.sourceHashes[projectName];
  }

  private async hashWorkspaceProject(
    projectName: string,
    visited: string[]
  ): Promise<ProjectHashResult> {
    return Promise.resolve().then(async () => {
      const deps = this.projectGraph.dependencies[projectName] ?? [];
      const depHashes = (
        await Promise.all(
          deps.map(async (d) => {
            if (visited.indexOf(d.target) > -1) {
              return null;
            } else {
              visited.push(d.target);
              return await this.hashProject(d.target, visited);
            }
          })
        )
      ).filter((r) => !!r);
      const projectHash = await this.hashProjectNodeSource(projectName);
      const nodes = depHashes.reduce(
        (m, c) => {
          return { ...m, ...c.nodes };
        },
        { [projectName]: projectHash }
      );

      const implicitDeps = await this.implicitDepsHasher.hashImplicitDeps(
        projectName
      );

      const value = this.hashing.hashArray([
        ...depHashes.map((d) => d.value),
        implicitDeps.value,
        projectHash,
      ]);

      return {
        value,
        nodes,
        implicitDeps: implicitDeps.files,
      };
    });
  }

  private async hashNonWorkspaceProject(
    projectName: string
  ): Promise<ProjectHashResult> {
    return Promise.resolve().then(async () => {
      return {
        value: this.nonWorkspaceProjectHash,
        nodes: { [projectName]: this.nonWorkspaceProjectHash },
        implicitDeps: {},
      };
    });
  }

  private removeOtherProjectsPathRecords(projectName: string) {
    const { paths, ...compilerOptions } = this.tsConfigJson.compilerOptions;

    const rootPath = this.workspaceJson.projects[projectName].root.split('/');
    rootPath.shift();
    const pathAlias = `@${this.nxJson.npmScope}/${rootPath.join('/')}`;

    return JSON.stringify({
      compilerOptions: {
        ...compilerOptions,
        paths: {
          [pathAlias]: paths[pathAlias] ?? [],
        },
      },
    });
  }

  private readTsConfig() {
    try {
      const res = readJsonFile(resolvePathFromRoot('tsconfig.base.json'));
      res.compilerOptions.paths ??= {};
      return res;
    } catch {
      return {
        compilerOptions: { paths: {} },
      };
    }
  }

  private readWorkspaceConfigFile(path: string): WorkspaceJsonConfiguration {
    try {
      const res = readJsonFile(path);
      res.projects ??= {};
      return resolveNewFormatWithInlineProjects(res);
    } catch {
      return { projects: {}, version: 2 };
    }
  }

  private readNxJsonConfigFile(path: string): NxJsonConfiguration {
    try {
      const res = readJsonFile(path);
      res.projects ??= {};
      return res;
    } catch {
      return { projects: {}, npmScope: '' };
    }
  }
}
