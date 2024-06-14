#! /usr/bin/env node
import figlet from "figlet";
import {Argument, program} from "commander";
import {$} from 'zx';
import {ProcessOutput} from "zx/build/core";

const branchArgument = new Argument('branch', 'Branchen du vil bytte til');

const app = program
    .version('1.0.0')
    .description('Et verktøy for å bytte branch smertefritt')
    .addArgument(branchArgument)
    .argument('[directory]', 'repository directory', '.')
    .option('-v, --verbose', 'verbose', true)
    .option('-q, --quiet', 'quiet', false)
    .option('-m, --mainbranch', 'main branch name', 'main')
    .parse(process.argv);

const branch = app.processedArgs[0];
const verbose = app.getOptionValue('verbose');
const quiet = app.getOptionValue('quiet');
const mainBranchName = app.getOptionValue('main branch name') || 'main';
const directory = app.getOptionValue('repository directory');

const log : typeof console.log = (...args) => !quiet && console.log.call(this, ...args);

log(figlet.textSync("ByttBranch", {horizontalLayout: "full"}));



const outputIsEmpty = (output: ProcessOutput) => output.stdout.trim() === '';

const commitMessage = `WIP - Committing changes before switching branch`;

const $$ = $({
    verbose,
    quiet,
    cwd: directory,
})

const checkIfLastCommitIsOurs = async () => {
    const log = await $$`git show -s --format=%s`;
    return log.stdout.trim() === commitMessage;
}

const doCommit = async () => {
    await $$`git add -u`;
    await $$`git commit -m ${commitMessage}`;
};

const hasChanges = async () => {
    const output: ProcessOutput = await $$`git status --untracked-files=no --porcelain=v1`;
    return !outputIsEmpty(output);
}

const doReset = async () => {
    await $$`git reset HEAD~1`;
}

const doCheckout = async (targetBranch: string) => {
    await $$`git checkout ${targetBranch}`;
}

const doCreateAndCheckout = async (targetBranch: string) => {
    await $$`git checkout -b ${targetBranch}`;
}

const doPull = async () => {
    await $$`git pull`;
}

const doesBranchExist = async (branch: string) => {
    const output = await $$`git branch --list ${branch}`;
    return !outputIsEmpty(output);
}

const doRun = async (targetBranch: string) => {
    log('Checking if there are changes')
    const needsCommit = await hasChanges();
    if (needsCommit) {
        log('Committing changes before switching branch');
        await doCommit()
    } else {
        log('No changes to commit')
    }
    log('Checking if target branch exists')
    if (await doesBranchExist(targetBranch)) {
        log('Target branch exists, checking out')
        await doCheckout(targetBranch);
        log('Checking last commit');
        if (await checkIfLastCommitIsOurs()) {
            log('Last commit is ours, resetting');
            await doReset();
        } else {
            log('Last commit is not ours, not resetting')
        }
    } else {
        log(`Branch "${targetBranch}" does not exist. Switching to main branch first (${mainBranchName})`);
        await doCheckout(mainBranchName);
        log(`Pulling latest changes from ${mainBranchName}`);
        await doPull();
        log(`Creating and checking out branch ${targetBranch}`);
        await doCreateAndCheckout(targetBranch);
    }
}

doRun(branch).then(() => !quiet && console.log('Done!'));
