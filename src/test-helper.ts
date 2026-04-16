/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { EOL } from 'os';
import path from 'path';
import { getOctokit as ghGetOctokit } from '@actions/github';
import { beforeEach, afterEach, vi, expect, type Mock } from 'vitest';

const _g = globalThis as any;

export const setupGlobal = (): void => {
  _g.mockStdout = { write: vi.fn() };
  process.stdout.write = _g.mockStdout.write;

  const converter = (prefix = '') => (value: any) =>
    process.stdout.write(prefix + JSON.stringify(value, null, '\t') + EOL);
  console.log = vi.fn(converter()) as any;
  console.info = vi.fn(converter('__info__')) as any;
  console.error = vi.fn(converter('__error__')) as any;
  console.warn = vi.fn(converter('__warning__')) as any;

  _g.mockChildProcess = {
    stdout: 'stdout',
    stderr: '',
    error: null,
    code: 0,
    exec: vi.fn((...args: any[]) => {
      const callback = args.length === 2 ? args[1] : args[2];
      callback(
        typeof _g.mockChildProcess.error === 'function' ? _g.mockChildProcess.error(args[0]) : _g.mockChildProcess.error,
        typeof _g.mockChildProcess.stdout === 'function' ? _g.mockChildProcess.stdout(args[0]) : _g.mockChildProcess.stdout,
        typeof _g.mockChildProcess.stderr === 'function' ? _g.mockChildProcess.stderr(args[0]) : _g.mockChildProcess.stderr,
      );
    }),
    spawn: vi.fn((...args: any[]) => ({
      stdout: {
        on: (event: string, callback: (data: string) => void) => {
          if (event === 'data') {
            callback(typeof _g.mockChildProcess.stdout === 'function' ? _g.mockChildProcess.stdout(args[0]) : _g.mockChildProcess.stdout);
          }
        },
      },
      stderr: {
        on: (event: string, callback: (data: string) => void) => {
          if (event === 'data') {
            callback(typeof _g.mockChildProcess.stderr === 'function' ? _g.mockChildProcess.stderr(args[0]) : _g.mockChildProcess.stderr);
          }
        },
      },
      on: (event: string, callback: (arg: any) => void) => {
        if (event === 'error') {
          const error = typeof _g.mockChildProcess.error === 'function' ? _g.mockChildProcess.error(args[0]) : _g.mockChildProcess.error;
          if (error) {
            callback(error);
          }
        } else if (event === 'close') {
          callback(typeof _g.mockChildProcess.code === 'function' ? _g.mockChildProcess.code(args[0]) : _g.mockChildProcess.code);
        }
      },
    })),
  };

  vi.mock('child_process', async() => ({
    ...await vi.importActual<object>('child_process'),
    exec: _g.mockChildProcess.exec,
    spawn: _g.mockChildProcess.spawn,
  }));

  process.env.GITHUB_ACTOR = 'octocat';
  process.env.GITHUB_PATH = '/home/runner/work/_temp/_runner_file_commands/add_path_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  process.env.GITHUB_ENV = '/home/runner/work/_temp/_runner_file_commands/set_env_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  process.env.GITHUB_STEP_SUMMARY = '/home/runner/work/_temp/_runner_file_commands/step_summary_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  process.env.GITHUB_STATE = '/home/runner/work/_temp/_runner_file_commands/save_state_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  process.env.GITHUB_OUTPUT = '/home/runner/work/_temp/_runner_file_commands/set_output_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
};

export const getContext = (override: { [key: string]: any }) =>
  Object.assign(
    {
      payload: { action: '' },
      eventName: '',
      sha: '',
      ref: '',
      workflow: '',
      action: '',
      actor: '',
      issue: { owner: '', repo: '', number: 1 },
      repo: { owner: '', repo: '' },
      job: '',
      runNumber: 1,
      runId: 1,
      runAttempt: 1,
      apiUrl: 'https://api.github.com',
      serverUrl: 'https://github.com',
      graphqlUrl: 'https://api.github.com/graphql',
    },
    override,
  );

export const generateContext = (
  settings: {
    event?: string;
    action?: string;
    ref?: string;
    sha?: string;
    owner?: string;
    repo?: string;
  },
  override?: { [key: string]: any },
) => {
  const overrideObj = override || {};
  return getContext(
    Object.assign(
      {},
      {
        eventName: settings.event ? settings.event : '',
        ref: settings.ref ? settings.ref : '',
        sha: settings.sha ? settings.sha : '',
        action: settings.owner ? settings.owner + '-generator' : '',
      },
      overrideObj,
      {
        payload: Object.assign(
          { action: settings.action ? settings.action : '' },
          overrideObj['payload'] || {},
        ),
        issue: Object.assign(
          {
            owner: settings.owner ? settings.owner : '',
            repo: settings.repo ? settings.repo : '',
          },
          overrideObj['issue'] || {},
        ),
        repo: Object.assign(
          {
            owner: settings.owner ? settings.owner : '',
            repo: settings.repo ? settings.repo : '',
          },
          overrideObj['repo'] || {},
        ),
      },
    ),
  );
};

const parseActionYml = (content: string): { [key: string]: { default?: string } } => {
  const inputs: { [key: string]: { default?: string } } = {};
  const lines = content.split('\n');
  let currentInput: string | null = null;
  let inInputs = false;

  for (const line of lines) {
    if (/^inputs:\s*$/.test(line)) {
      inInputs = true;
      continue;
    }
    if (inInputs && /^\S/.test(line)) {
      inInputs = false;
      currentInput = null;
      continue;
    }
    if (inInputs) {
      const inputMatch = line.match(/^\s{2}(\w+):\s*$/);
      if (inputMatch) {
        currentInput = inputMatch[1]!;
        inputs[currentInput] = {};
        continue;
      }
      if (currentInput && inputs[currentInput]) {
        const defaultMatch = line.match(/^\s+default:\s*'([^']*)'\s*$/) || line.match(/^\s+default:\s*"([^"]*)"\s*$/) || line.match(/^\s+default:\s*(.*?)\s*$/);
        if (defaultMatch) {
          inputs[currentInput]!.default = defaultMatch[1] ?? '';
        }
      }
    }
  }
  return inputs;
};

const setActionEnv = (rootDir: string) => {
  const content = fs.readFileSync(path.resolve(rootDir, 'action.yml'), 'utf8');
  const inputs = parseActionYml(content);
  const envs = Object.keys(inputs)
    .filter((key) => inputs[key] && 'default' in inputs[key]!)
    .map((key) => ({
      key: `INPUT_${key.replace(/ /g, '_').toUpperCase()}`,
      value: `${inputs[key]!.default}`,
    }));
  envs.forEach((env) => {
    process.env[env.key] = env.value;
  });
  return envs;
};

export const testEnv = (rootDir?: string): void => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.NODE_ENV;
    if (rootDir) {
      setActionEnv(rootDir);
    }
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });
};

export const testChildProcess = (): void => {
  afterEach(() => {
    _g.mockChildProcess.stdout = 'stdout';
    _g.mockChildProcess.stderr = '';
    _g.mockChildProcess.error = null;
    _g.mockChildProcess.code = 0;
  });
};

export const setChildProcessParams = (params: {
  stdout?: string | ((command: string) => string);
  stderr?: string | ((command: string) => string);
  error?: Error | ((command: string) => Error | null);
  code?: number | ((command: string) => number);
}): void => {
  if (typeof params.stdout === 'string' || typeof params.stdout === 'function') {
    _g.mockChildProcess.stdout = params.stdout;
  }
  if (typeof params.stderr === 'string' || typeof params.stderr === 'function') {
    _g.mockChildProcess.stderr = params.stderr;
  }
  if (params.error instanceof Error || typeof params.error === 'function') {
    _g.mockChildProcess.error = params.error;
  }
  if (typeof params.code === 'number' || typeof params.code === 'function') {
    _g.mockChildProcess.code = params.code;
  }
};

export const testFs = (defaultExists = false): ((flag?: any) => void) => {
  let existsData = [defaultExists];
  let existsCallback: ((p: any) => boolean) | undefined = undefined;
  let count = 0;
  let stop = false;
  const spies: any[] = [];

  const setupMock = () => {
    if (stop) return;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    spies.push(vi.spyOn(fs, 'writeFileSync').mockImplementation((() => {}) as any));
    spies.push(vi.spyOn(fs, 'mkdirSync').mockImplementation((() => undefined) as any));
    spies.push(
      vi.spyOn(fs, 'existsSync').mockImplementation(((p: any) => {
        if (typeof existsCallback === 'function') return existsCallback(p);
        const result = count < existsData.length ? existsData[count] : existsData[existsData.length - 1]!;
        count++;
        return result;
      }) as any),
    );
  };
  const clearMock = () => {
    spies.forEach((s) => s.mockRestore());
    spies.length = 0;
    existsCallback = undefined;
    existsData = [defaultExists];
    count = 0;
  };
  beforeEach(setupMock);
  afterEach(clearMock);

  return (flag?: any) => {
    existsCallback = undefined;
    stop = false;
    if (undefined === flag) {
      stop = true;
      clearMock();
    } else if (typeof flag === 'function') {
      existsCallback = flag;
    } else if (typeof flag === 'boolean') {
      existsData = [flag];
    } else {
      existsData = flag;
    }
  };
};

export const spyOnStdout = (): Mock => _g.mockStdout.write;
export const spyOnSpawn = (): Mock => _g.mockChildProcess.spawn;

export const execCalledWith = (spyOnMock: Mock, messages: (string | any[])[]): void => {
  expect(spyOnMock).toBeCalledTimes(messages.length);
  messages.forEach((message, index) => {
    if (typeof message === 'string') {
      expect(spyOnMock.mock.calls[index]![0]).toBe(message);
    } else {
      (message as any[]).forEach((msg, index2) => {
        if (typeof spyOnMock.mock.calls[index]![index2] === 'object') {
          expect(spyOnMock.mock.calls[index]![index2]).toEqual(msg);
        } else {
          expect(spyOnMock.mock.calls[index]![index2]).toBe(msg);
        }
      });
    }
  });
};

export const stdoutCalledWith = (spyOnMock: Mock, messages: string[]): void => {
  expect(spyOnMock).toBeCalledTimes(messages.length);
  messages.forEach((message, index) => {
    expect(spyOnMock.mock.calls[index]![0]).toBe(message + EOL);
  });
};

export const disableNetConnect = (nock: any): void => {
  beforeEach(() => {
    nock.disableNetConnect();
  });
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
};

export const getApiFixture = (rootDir: string, name: string, ext = '.json'): any => {
  const content = fs.readFileSync(path.resolve(rootDir, `${name}${ext}`)).toString();
  switch (ext.toLowerCase()) {
    case '.json':
      return JSON.parse(content);
    default:
      return { content };
  }
};

export const getOctokit = (token?: string) => ghGetOctokit(token ?? 'test-token', { request: { fetch: globalThis.fetch } });
