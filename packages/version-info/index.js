import { existsSync }  from 'node:fs';
import { join, parse } from 'node:path';
import { cwd }         from 'node:process';
import { readFile }    from 'node:fs/promises';

const findFile = (file) => {
    let dir = cwd();

    while (dir !== parse(dir).root) {
        if (existsSync(join(dir, file))) {
            return dir;
        }

        dir = join(dir, '../');
    }
}

const root = findFile('.git');
const pack = findFile('package.json');

const readGit = async (filename) => {
    if (!root) return null;
    try {
        return await readFile(join(root, filename), 'utf8');
    } catch {
        return null;
    }
}

export const getCommit = async () => {
    if (process.env.RAILWAY_GIT_COMMIT_SHA) return process.env.RAILWAY_GIT_COMMIT_SHA;
    const log = await readGit('.git/logs/HEAD');
    return log?.split('\n')?.filter(String)?.pop()?.split(' ')[1] || 'unknown';
}

export const getBranch = async () => {
    if (process.env.RAILWAY_GIT_BRANCH) return process.env.RAILWAY_GIT_BRANCH;
    if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;
    if (process.env.WORKERS_CI_BRANCH) return process.env.WORKERS_CI_BRANCH;

    const head = await readGit('.git/HEAD');
    return head?.replace(/^ref: refs\/heads\//, '')?.trim() || 'unknown';
}

export const getRemote = async () => {
    if (process.env.RAILWAY_GIT_REPO_OWNER && process.env.RAILWAY_GIT_REPO_NAME) {
        return `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`;
    }

    let config = await readGit('.git/config');
    let remote = config?.split('\n')?.find(line => line.includes('url = '))?.split('url = ')[1];

    if (remote?.startsWith('git@')) {
        remote = remote.split(':')[1];
    } else if (remote?.startsWith('http')) {
        try {
            remote = new URL(remote).pathname.substring(1);
        } catch { }
    }

    remote = remote?.replace(/\.git$/, '');

    return remote || 'unknown';
}

export const getVersion = async () => {
    if (!pack) return 'unknown';

    try {
        const { version } = JSON.parse(
            await readFile(join(pack, 'package.json'), 'utf8')
        );
        return version;
    } catch {
        return 'unknown';
    }
}
