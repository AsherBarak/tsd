/// <reference path="../_ref.d.ts" />

'use strict';

import typeOf = require('../../xm/typeOf');
import dateUtils = require('../../xm/dateUtils');
import collection = require('../../xm/collection');
import StyledOut = require('../../xm/lib/StyledOut');
import AuthorInfo = require('../support/AuthorInfo');

import GithubRateInfo = require('../../git/model/GithubRateInfo');

import DefVersion = require('../data/DefVersion');
import defUtil = require('../util/defUtil');

import InstallResult = require('../logic/InstallResult');

var lineSplitExp = /[ \t]*[\r\n][ \t]*/g;

class Printer {

	output: StyledOut;
	indent: number = 0;
	skipProgress = [
		/^(?:\w+: )?written zero \w+ bytes/,
		/^(?:\w+: )?missing \w+ file/,
		/^(?:\w+: )?remote:/,
		/^(?:\w+: )?dropped from cache:/,
		/^(?:\w+: )?local:/,
		/^(?:\w+: )?update:/
	];

	private _remainingPrev: number = -1;

	constructor(output: StyledOut, indent: number = 0) {
		this.output = output;
		this.indent = indent;

		this.reportProgress = this.reportProgress.bind(this);
	}

	fmtSortKey(key: string): string {
		return String(key).substr(0, 6);
	}

	fmtGitURI(str: string): string {
		return String(str).replace(/https:\/\/[a-z]+\.github\.com\/(?:repos\/)?/g, '').replace(/([0-9a-f]{40})/g, (match, p1) => {
			return this.fmtSortKey(p1);
		});
	}

	file(file: DefVersion, sep: string = ' : '): StyledOut {
		if (file.def) {
			this.output.tweakPath(file.def.path);
		}
		else {
			this.output.accent('<no def>');
		}
		return this.output.accent(sep).glue(this.fileEnd(file, sep));
	}

	fileEnd(file: DefVersion, sep: string = ' | '): StyledOut {
		if (file.def && file.def.head === file) {
			this.output.span('<head>');
			if (file.commit.changeDate) {
				this.output.accent(sep).span(dateUtils.toNiceUTC(file.commit.changeDate));
			}
		}
		else {
			if (file.commit) {
				this.output.span(file.commit.commitShort);
				if (file.commit.changeDate) {
					this.output.accent(sep).span(dateUtils.toNiceUTC(file.commit.changeDate));
				}
			}
			else {
				this.output.accent(sep).accent('<no commit>');
			}
		}
		/*if (file.blobSha) {
			this.output.span(sep).span(file.blobShaShort);
		}*/
		return this.output;
	}

	fileCommit(file: DefVersion, skipNull: boolean = false): StyledOut {
		var sep = '  |  ';
		if (file.commit) {
			this.output.indent(1).glue(this.fileEnd(file, sep));
			this.output.accent(sep).span(file.commit.gitAuthor.name);
			if (file.commit.hubAuthor) {
				this.output.accent('  @  ').span(file.commit.hubAuthor.login);
			}
			this.output.ln().ln();

			this.output.indent(1).edge(true).line(file.commit.message.subject);

			if (file.commit.message.body) {
				this.output.indent(1).edge(true).ln();

				file.commit.message.body.split(lineSplitExp).every((line: string, index: number, lines: string[]) => {
					this.output.indent(1).edge(true).line(line);
					if (index < 10) {
						return true;
					}
					this.output.indent(1).edge(true).line('<...>');
					return false;
				});
			}
		}
		else if (!skipNull) {
			this.output.indent(1).accent('<no commmit>').ln();
		}
		return this.output;
	}

	fileHead(file: DefVersion): StyledOut {
		return this.output.indent(0).bullet(true).glue(this.file(file)).ln();
	}

	fileInfo(file: DefVersion, skipNull: boolean = false): StyledOut {
		if (file.info) {
			this.output.line();
			if (file.info.isValid()) {
				this.output.indent(1).tweakPunc(file.info.toString());
				file.info.projects.forEach((url) => {
					this.output.space().tweakURI(url, true, true);
				});
				this.output.ln();

				if (file.info.authors) {
					this.output.ln();
					file.info.authors.forEach((author: AuthorInfo) => {
						this.output.indent(1).bullet(true).span(author.name);
						if (author.url) {
							this.output.space().tweakURI(author.url, true, true);
						}
						this.output.ln();
					});
				}
			}
			else {
				this.output.indent(1).accent('<invalid info>').line();
			}
		}
		else if (!skipNull) {
			this.output.line();
			this.output.indent(1).accent('<no info>').line();
		}
		return this.output;
	}

	dependencies(file: DefVersion): StyledOut {
		if (file.dependencies.length > 0) {
			this.output.line();
			var deps = defUtil.mergeDependenciesOf(file.dependencies).filter((refer: DefVersion) => {
				return refer.def.path !== file.def.path;
			});
			if (deps.length > 0) {
				deps.filter((refer: DefVersion) => {
					return refer.def.path !== file.def.path;
				}).sort(defUtil.fileCompare).forEach((refer: DefVersion) => {
					this.output.indent(1).report(true).glue(this.file(refer)).ln();

					/*if (refer.dependencies.length > 0) {
					 refer.dependencies.sort(defUtil.defCompare).forEach((dep:Def) => {
					 this.output.indent(2).bullet(true).tweakPath(dep.path).ln();
					 });
					 this.output.ln();
					 }*/
				});
			}
		}
		return this.output;
	}

	history(file: DefVersion): StyledOut {
		if (file.def.history.length > 0) {
			this.output.line();
			file.def.history.slice(0).reverse().forEach((file: DefVersion, i: number) => {
				this.fileCommit(file);
				this.output.cond(i < file.def.history.length - 1, '\n');
			});
		}
		return this.output;
	}

	installResult(result: InstallResult): StyledOut {
		var keys = result.written.keys();
		if (keys.length === 0) {
			this.output.ln().report(true).span('written ').accent('zero').span(' files').ln();
		}
		else if (keys.length === 1) {
			this.output.ln().report(true).span('written ').accent(keys.length).span(' file:').ln().ln();
		}
		else {
			this.output.ln().report(true).span('written ').accent(keys.length).span(' files:').ln().ln();
		}

		// TODO report on written/skipped
		keys.sort().forEach((path: string) => {
			this.output.indent().bullet(true);
			var file: DefVersion = result.written.get(path);
			if (file.def) {
				this.output.tweakPath(file.def.path);
			}
			else {
				this.output.accent('<no def>');
			}
			this.output.ln();
		});
		// this.output.ln().report(true).span('install').space().success('success!').ln();
		return this.output;
	}

	rateInfo(info: GithubRateInfo, note: boolean = false, force: boolean = false): StyledOut {
		var warnLim = 10;
		var goodLim = 30;
		var stealthLim = 45;

		if (info.remaining === this._remainingPrev && !force) {
			return this.output;
		}
		this._remainingPrev = info.remaining;
		if (info.remaining === info.limit && !force) {
			return this.output;
		}
		if (info.remaining > stealthLim && !force) {
			return this.output;
		}

		if (note) {
			this.output.indent(1);
		}
		else {
			this.output.line();
		}
		this.output.note(true).span('rate-limit').sp();

		/* tslint:disable:max-line-length */
		if (info.limit > 0) {
			if (info.remaining === 0) {
				this.output.error(info.remaining).span(' / ').error(info.limit).span(' -> ').error(info.getResetString());
			}
			else if (info.remaining <= warnLim) {
				this.output.warning(info.remaining).span(' / ').warning(info.limit).span(' -> ').warning(info.getResetString());
			}
			else if (info.remaining <= goodLim) {
				this.output.success(info.remaining).span(' / ').success(info.limit).span(' -> ').success(info.getResetString());
			}
			else {
				this.output.accent(info.remaining).span(' / ').accent(info.limit);
				if (force) {
					this.output.span(' -> ').success(info.getResetString());
				}
			}
		}
		/* tslint:enable:max-line-length */
		else {
			this.output.success(info.getResetString());
		}
		return this.output.ln();
	}

	reportError(err: any, head: boolean = true): StyledOut {
		if (head) {
			this.output.ln().info().error('an error occured!').clear();
		}
		this.output.line(err.message);
		if (err.stack) {
			return this.output.block(err.stack);
		}
		return this.output.line(err);
	}

	reportProgress(obj: any): StyledOut {
		// hackytek
		if (obj instanceof GithubRateInfo) {
			return this.rateInfo(obj, true);
		}
		if (typeOf.isObject(obj)) {
			if (obj.data instanceof GithubRateInfo) {
				return this.rateInfo(obj.data, true);
			}
			// want this?
			if (obj.message) {
				if (this.skipProgress.some((exp: RegExp) => {
					return exp.test(obj.message);
				})) {
					// let's skip this one
					return this.output;
				}
			}

			this.output.indent().note(true);

			if (typeOf.isValid(obj.code)) {
				this.output.label(obj.code);
			}
			if (obj.message) {
				var msg = this.fmtGitURI(String(obj.message));
				msg = msg.replace(/([\w\\\/])(: )([\w\\\/\.-])/g, (match, p1, p2, p3) => {
					return p1 + this.output.getStyle().accent(p2) + p3;
				});
				msg = msg.replace(' -> ', this.output.getStyle().accent(' -> '));
				this.output.write(msg);
			}
			else {
				this.output.span('<no message>');
			}
			if (obj.data) {
				this.output.sp().inspect(obj, 3);
			}
			else {
				this.output.ln();
			}

			return this.output;
		}
		else {
			return this.output.indent().note(true).span(String(obj)).ln();
		}
		return this.output.indent().note(true).label(typeOf.get(obj)).inspect(obj, 3);
	}
}

export = Printer;
