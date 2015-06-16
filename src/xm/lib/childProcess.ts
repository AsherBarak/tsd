/// <reference path="../_ref.d.ts" />

'use strict';

import Promise = require('bluebird');
import childProcess = require('child_process');
import assertVar = require('../assertVar');

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export interface RunCLIResult {
	code:number;
	error:Error;
	stdout:Buffer;
	stderr:Buffer;
	args:string[];
}

// TODO decide runCLI use fork(), exec() or spawn() (fork slightly faster? does it matter?)
// TODO fix code to properly show errors
export function runCLI(modulePath: string, args: string[], debug: boolean = false, cwd: string = './'): Promise<RunCLIResult> {
	return new Promise<RunCLIResult>((resolve, reject) => {
		assertVar(modulePath, 'string', 'modulePath');
		assertVar(args, 'array', 'args');

		var stdout: Buffer[] = [];
		var stderr: Buffer[] = [];

		var options: any = {
			silent: true
		};
		if (cwd) {
			options.cwd = cwd;
		}

		var getResult = (code: number = 0, err: Error = null): RunCLIResult => {
			var res: RunCLIResult = {
				code: code,
				error: err || null,
				stdout: Buffer.concat(stdout),
				stderr: Buffer.concat(stderr),
				args: args
			};
			if (debug && res.code > 0) {
				console.log(['node', modulePath , res.args.join(' ')].join(' '));
				console.log('error: ' + res.error);
				console.log('code: ' + res.code);
				console.log(res.stdout.toString('utf8'));
				if (res.stderr.length) {
					console.error(res.stderr.toString('utf8'));
				}
			}
			return res;
		};

		args.unshift(modulePath);

		var child = childProcess.spawn('node', args, options);
		if (!child) {
			resolve(getResult(1, new Error('child spawned as null')));
			return;
		}

		child.stdout.on('data', (chunk: Buffer) => {
			stdout.push(chunk);
			if (debug) {
				process.stdout.write(chunk);
			}
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr.push(chunk);
			if (debug) {
				process.stdout.write(chunk);
			}
		});

		child.on('error', (err: any) => {
			if (err) {
				console.error('child process exited with code ' + err.code);
				console.error(err);
			}
			// never fail (we might test for cli failure after all)
			resolve(getResult(1, err));
		});

		child.on('exit', () => {
			resolve(getResult(0, null));
		});
	});
}
