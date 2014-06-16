/// <reference path="../_ref.d.ts" />

'use strict';

import semver = require('semver');

import assertVar = require('../../xm/assertVar');
import objectUtils = require('../../xm/objectUtils');

import DefVersion = require('./DefVersion');

/*
 Def: single definition in repo (identified by its path)
 */
class Def {

	static nameExp = /^([\w\.-]*)\/([\w\.-]*)\.d\.ts$/;
	static nameExpEnd = /([\w\.-]*)\/([\w\.-]*)\.d\.ts$/;

	static versionEnd = /(?:-v?)(\d+(?:\.\d+)*)((?:-[a-z]+)?)$/i;
	static twoNums = /^\d+\.\d+$/;

	// unique identifier: 'project/name-v0.1.3-alpha.d.ts'
	path: string;

	// split
	project: string;
	name: string;
	// used?
	semver: string;

	// version from the DefIndex commit +tree (may be not our edit)
	head: DefVersion;

	// versions from commits that changed this file
	history: DefVersion[] = [];

	constructor(path: string) {
		assertVar(path, 'string', 'path');
		this.path = path;
	}

	toString(): string {
		return this.project + '/' + this.name + (this.semver ? '-v' + this.semver : '');
	}

	// TODO add test
	get pathTerm(): string {
		return this.path.replace(/\.d\.ts$/, '');
	}

	// TODO add test
	static getPathExp(trim: boolean): RegExp {
		var useExp: RegExp = (trim ? Def.nameExpEnd : Def.nameExp);
		useExp.lastIndex = 0;
		return useExp;
	}

	// TODO add test
	static getFileFrom(path: string): string {
		var useExp: RegExp = Def.getPathExp(true);
		var match = useExp.exec(path);
		if (!match) {
			return null;
		}
		return match[1] + '/' + match[2] + '.d.ts';
	}

	static isDefPath(path: string, trim: boolean = false): boolean {
		if (Def.getPathExp(trim).test(path)) {
			Def.versionEnd.lastIndex = 0;
			var semMatch = Def.versionEnd.exec(path);
			if (!semMatch) {
				return true;
			}
			var sem = semMatch[1];
			if (Def.twoNums.test(sem)) {
				sem += '.0';
			}
			if (semMatch.length > 2) {
				sem += semMatch[2];
			}
			return !semver.valid(sem, true);
		}
		return false;
	}

	static getFrom(path: string, trim: boolean = false): Def {
		var useExp: RegExp = Def.getPathExp(trim);

		var match: RegExpExecArray = useExp.exec(path);
		if (!match) {
			return null;
		}
		if (match.length < 1) {
			return null;
		}
		if (match[1].length < 1 || match[2].length < 1) {
			return null;
		}
		var file = new Def(path);
		file.project = match[1];
		file.name = match[2];

		Def.versionEnd.lastIndex = 0;
		var semMatch = Def.versionEnd.exec(file.name);
		if (semMatch) {
			var sem = semMatch[1];
			// append missing patch version
			if (Def.twoNums.test(sem)) {
				sem += '.0';
			}
			if (semMatch.length > 2) {
				sem += semMatch[2];
			}

			var valid = semver.valid(sem, true);
			if (valid) {
				file.semver = valid;
				file.name = file.name.substr(0, semMatch.index);
			}
			else {
				// console.log('invalid semver', sem);
			}
		}

		return file;
	}
}

export = Def;
