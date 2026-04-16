import { type Mock } from 'vitest';
export declare const setupGlobal: () => void;
export declare const getContext: (override: {
    [key: string]: any;
}) => {
    payload: {
        action: string;
    };
    eventName: string;
    sha: string;
    ref: string;
    workflow: string;
    action: string;
    actor: string;
    issue: {
        owner: string;
        repo: string;
        number: number;
    };
    repo: {
        owner: string;
        repo: string;
    };
    job: string;
    runNumber: number;
    runId: number;
    runAttempt: number;
    apiUrl: string;
    serverUrl: string;
    graphqlUrl: string;
} & {
    [key: string]: any;
};
export declare const generateContext: (settings: {
    event?: string;
    action?: string;
    ref?: string;
    sha?: string;
    owner?: string;
    repo?: string;
}, override?: {
    [key: string]: any;
} | undefined) => {
    payload: {
        action: string;
    };
    eventName: string;
    sha: string;
    ref: string;
    workflow: string;
    action: string;
    actor: string;
    issue: {
        owner: string;
        repo: string;
        number: number;
    };
    repo: {
        owner: string;
        repo: string;
    };
    job: string;
    runNumber: number;
    runId: number;
    runAttempt: number;
    apiUrl: string;
    serverUrl: string;
    graphqlUrl: string;
} & {
    [key: string]: any;
};
export declare const testEnv: (rootDir?: string) => void;
export declare const testChildProcess: () => void;
export declare const setChildProcessParams: (params: {
    stdout?: string | ((command: string) => string) | undefined;
    stderr?: string | ((command: string) => string) | undefined;
    error?: Error | ((command: string) => Error | null) | undefined;
    code?: number | ((command: string) => number) | undefined;
}) => void;
export declare const testFs: (defaultExists?: boolean) => (flag?: any) => void;
export declare const spyOnStdout: () => Mock;
export declare const spyOnSpawn: () => Mock;
export declare const execCalledWith: (spyOnMock: Mock, messages: (string | any[])[]) => void;
export declare const stdoutCalledWith: (spyOnMock: Mock, messages: string[]) => void;
export declare const disableNetConnect: (nock: any) => void;
export declare const getApiFixture: (rootDir: string, name: string, ext?: string) => any;
export declare const getOctokit: (token?: string) => any;
