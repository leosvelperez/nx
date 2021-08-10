import { NxJsonConfiguration, ProjectGraph, Task } from '@nrwl/devkit';
import { exec } from 'child_process';
import { performance } from 'perf_hooks';
import { defaultFileHasher, FileHasher } from './file-hasher';
import { defaultHashing, HashingImpl } from './hashing-impl';
import { ImplicitDepsHasher, ImplicitHashResult } from './implicit-deps-hasher';
import { ProjectHasher, ProjectHashResult } from './project-hasher';

export interface Hash {
  value: string;
  details: {
    command: string;
    nodes: { [name: string]: string };
    implicitDeps: { [fileName: string]: string };
    runtime: { [input: string]: string };
  };
}

interface RuntimeHashResult {
  value: string;
  runtime: { [input: string]: string };
}

export class Hasher {
  static version = '2.0';
  private runtimeInputs: Promise<RuntimeHashResult>;
  private fileHasher: FileHasher;
  private implicitDepsHasher: ImplicitDepsHasher;
  private projectHasher: ProjectHasher;
  private hashing: HashingImpl;

  constructor(
    private readonly projectGraph: ProjectGraph,
    private readonly nxJson: NxJsonConfiguration,
    private readonly options: any,
    hashing: HashingImpl = undefined
  ) {
    if (!hashing) {
      this.hashing = defaultHashing;
      this.fileHasher = defaultFileHasher;
    } else {
      // this is only used for testing
      this.hashing = hashing;
      this.fileHasher = new FileHasher(hashing);
      this.fileHasher.clear();
    }
    this.implicitDepsHasher = new ImplicitDepsHasher(
      this.projectGraph,
      this.nxJson,
      this.hashing,
      this.fileHasher
    );
    this.projectHasher = new ProjectHasher(
      this.projectGraph,
      this.hashing,
      this.implicitDepsHasher,
      { selectivelyHashTsConfig: this.options.selectivelyHashTsConfig ?? false }
    );
  }

  async hashTaskWithDepsAndContext(task: Task): Promise<Hash> {
    const command = this.hashCommand(task);

    const values = (await Promise.all([
      this.projectHasher.hashProject(task.target.project, [
        task.target.project,
      ]),
      this.runtimeInputsHash(),
    ])) as [ProjectHashResult, RuntimeHashResult];

    const value = this.hashing.hashArray([
      Hasher.version,
      command,
      ...values.map((v) => v.value),
    ]);

    return {
      value,
      details: {
        command,
        nodes: values[0].nodes,
        implicitDeps: values[0].implicitDeps,
        runtime: values[1].runtime,
      },
    };
  }

  hashCommand(task: Task) {
    return this.hashing.hashArray([
      task.target.project ?? '',
      task.target.target ?? '',
      task.target.configuration ?? '',
      JSON.stringify(task.overrides),
    ]);
  }

  async hashContext(task: Task): Promise<{
    implicitDeps: ImplicitHashResult;
    runtime: RuntimeHashResult;
  }> {
    const values = (await Promise.all([
      this.implicitDepsHasher.hashImplicitDeps(task.target.project),
      this.runtimeInputsHash(),
    ])) as [ImplicitHashResult, RuntimeHashResult];

    return {
      implicitDeps: values[0],
      runtime: values[1],
    };
  }

  async hashSource(task: Task): Promise<string> {
    return this.projectHasher.hashProjectNodeSource(task.target.project);
  }

  hashArray(values: string[]): string {
    return this.hashing.hashArray(values);
  }

  private async runtimeInputsHash(): Promise<RuntimeHashResult> {
    if (this.runtimeInputs) return this.runtimeInputs;

    performance.mark('hasher:runtime inputs hash:start');

    this.runtimeInputs = new Promise(async (res, rej) => {
      const inputs =
        this.options && this.options.runtimeCacheInputs
          ? this.options.runtimeCacheInputs
          : [];
      if (inputs.length > 0) {
        try {
          const values = (await Promise.all(
            inputs.map(
              (input) =>
                new Promise((res, rej) => {
                  exec(input, (err, stdout, stderr) => {
                    if (err) {
                      rej(err);
                    } else {
                      res({ input, value: `${stdout}${stderr}`.trim() });
                    }
                  });
                })
            )
          )) as any;

          const value = this.hashing.hashArray(values.map((v) => v.value));
          const runtime = values.reduce(
            (m, c) => ((m[c.input] = c.value), m),
            {}
          );

          performance.mark('hasher:runtime inputs hash:end');
          performance.measure(
            'hasher:runtime inputs hash',
            'hasher:runtime inputs hash:start',
            'hasher:runtime inputs hash:end'
          );
          res({ value, runtime });
        } catch (e) {
          rej(
            new Error(
              `Nx failed to execute runtimeCacheInputs defined in nx.json failed:\n${e.message}`
            )
          );
        }
      } else {
        res({ value: '', runtime: {} });
      }
    });

    return this.runtimeInputs;
  }
}
