/// <reference path="../_ref.d.ts" />

'use strict';

/*
Expose: cli command manager and help generator
*/

import Promise = require('bluebird');

import typeOf = require('../xm/typeOf');
import parse = require('../xm/parseString');

import StyledOut = require('../xm/lib/StyledOut');

import Expose = require('./Expose');
import Command = require('./Command');

/*
 Context: access the parameters of a single call
 */
// TODO should have a reject/resolve method
// TODO add assertion mode (hardcore verification for dev/test)
class Context {

	expose: Expose;
	command: Command;
	argv: any;
	out: StyledOut;

	constructor(expose: Expose, argv: any, command?: Command) {
		this.expose = expose;
		this.command = command;
		this.argv = argv;
		// TODO maybe keep reporter instead of out?
		this.out = this.expose.reporter.output;
	}

	hasOpt(name: string, strict: boolean = false): any {
		if (typeOf.hasOwnProp(this.argv, name)) {
			if (strict && !this.expose.options.has(name)) {
				return false;
			}
			return true;
		}
		return false;
	}

	getOptRaw(name: string, alt?: any): any {
		if (typeOf.hasOwnProp(this.argv, name)) {
			return this.argv[name];
		}
		return alt;
	}

	getOpt(name: string, alt?: any): any {
		if (this.hasOpt(name)) {
			var option = this.expose.options.get(name);
			if (option && option.type) {
				try {
					return parse.parseStringTo(this.argv[name], option.type);
				}
				catch (e) {
					// what?
				}
			}
			else {
				return this.argv[name];
			}
		}
		return this.getDefault(name, alt);
	}

	getOptAs(name: string, type: string, alt?: any): any {
		if (this.hasOpt(name)) {
			return parse.parseStringTo(this.argv[name], type);
		}
		return this.getDefault(name, alt);
	}

	getOptNames(strict: boolean = false): string[] {
		return Object.keys(this.argv).filter((name: string) => {
			return (name !== '_' && this.hasOpt(name, strict));
		});
	}

	getOptEnum(name: string, alt?: any): any {
		if (this.hasOpt(name)) {
			if (this.expose.options.has(name)) {
				var option = this.expose.options.get(name);
				var value = this.getOpt(name);
				if (option.enum && option.enum.indexOf(value) > -1) {
					return value;
				}
			}
		}
		return alt;
	}

	getDefault(name: string, alt?: any): any {
		var option = this.expose.options.get(name);
		if (option && !typeOf.isUndefined(option.default)) {
			return option.default;
		}
		return alt;
	}

	isDefault(name: string): boolean {
		if (this.hasOpt(name, true)) {
			var def = this.expose.options.get(name).default;
			if (!typeOf.isUndefined(def)) {
				return (def === this.getOpt(name));
			}
		}
		return false;
	}

	getArgAt(index: number, alt?: any): any {
		if (index >= 0 && index < this.argv._.length) {
			return this.argv._[index];
		}
		return alt;
	}

	// (booya!)
	getArgAtAs(index: number, type: string, alt?: any): any {
		if (index >= 0 && index < this.argv._.length) {
			return parse.parseStringTo(this.argv._[index], type);
		}
		return alt;
	}

	// (gasp!)
	getArgsAs(type: string): any[] {
		return this.argv._.map((value: string) => {
			return parse.parseStringTo(value, type);
		});
	}

	shiftArg(alt?: string): any {
		if (this.argv._.length > 0) {
			return this.argv._.shift();
		}
		return alt;
	}

	shiftArgAs(type: string, alt?: string): any {
		if (this.argv._.length > 0) {
			return parse.parseStringTo(this.argv._.shift(), type);
		}
		return alt;
	}

	getArgs(alt?: string): any {
		if (this.argv._.length > 0) {
			return this.argv._.shift();
		}
		return alt;
	}

	get numArgs(): number {
		return this.argv._.length;
	}
}

export = Context;
