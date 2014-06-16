/// <reference path="../_ref.d.ts" />

'use strict';

import StatCounter = require('./StatCounter');
import typeOf = require('../typeOf');
import inspect = require('../inspect');
import encode = require('../encode');
import objectUtils = require('../objectUtils');
import Promise = require('bluebird');

function padL(input: string, len: number, char: string): string {
	char = String(char).charAt(0);
	input = String(input);
	while (input.length < len) {
		input = char + input;
	}
	return input;
}

export function valueMap(data: any): any {
	return Object.keys(data).reduce((memo: any, key: string) => {
		if (typeOf.isValueType(data[key])) {
			memo[key] = data[key];
		}
		return memo;
	}, Object.create(null));
}

// some standard levels
// TODO replace with proper enum
export var EventLevel = {
	start: 'start',
	complete: 'complete',
	failure: 'failure',
	skip: 'skip',
	share: 'share',

	event: 'event',

	error: 'error',
	warning: 'warning',
	success: 'success',
	status: 'status',

	promise: 'promise',
	resolve: 'resolve',
	reject: 'reject',
	notify: 'notify',

	debug: 'debug',
	log: 'log'
};
EventLevel = valueMap(EventLevel);
// subzero
Object.freeze(EventLevel);

export var startTime = Date.now();

export class EventLog {
	private _items: EventLogItem[] = [];

	private _label: string;
	private _prefix: string;
	private _startAt: number;

	private _logEnabled: boolean = false;
	private _trackEnabled: boolean = false;
	private _trackLimit: number = 100;
	private _trackPrune: number = 30;

	private _mutePromises: string[] = [EventLevel.notify, EventLevel.promise, EventLevel.resolve, EventLevel.reject];

	constructor(prefix: string = '', label: string = '', log: boolean = false) {
		this._label = label;
		this._prefix = (prefix ? prefix + ':' : '');

		// TODO this is not dynamic (style/out not updatable)
		this._logEnabled = log;

		this._startAt = Date.now();
	}

	// many lazy wrappers

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	// TODO rethink arguments and add type-filtering
	promise(promise: Promise<any>, type: string, message?: string, data?: any): EventLogItem {
		if (!this.isMuted(EventLevel.notify)) {
			promise.progressed((note) => {
				this.track(EventLevel.notify, type, message, note);
			});
		}
		if (!this.isMuted(EventLevel.reject)) {
			promise.catch((err) => {
				this.track(EventLevel.reject, type, message, err);
			});
		}
		if (!this.isMuted(EventLevel.resolve)) {
			promise.then(() => {
				this.track(EventLevel.resolve, type, message);
			});
		}
		if (!this.isMuted(EventLevel.promise)) {
			return this.track(EventLevel.promise, type, message);
		}
		return null;
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	start(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.start, type, message, data);
	}

	complete(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.complete, type, message, data);
	}

	failure(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.complete, type, message, data);
	}

	event(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.event, type, message, data);
	}

	skip(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.skip, type, message, data);
	}

	share(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.share, type, message, data);
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	error(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.error, type, message, data);
	}

	warning(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.warning, type, message, data);
	}

	success(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.success, type, message, data);
	}

	status(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.status, type, message, data);
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	log(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.log, type, message, data);
	}

	debug(type: string, message?: string, data?: any): EventLogItem {
		return this.track(EventLevel.debug, type, message, data);
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	track(action: string, type: string, message?: string, data?: any, group?: any): EventLogItem {
		var item = new EventLogItem();
		item.type = this._prefix + type;
		item.action = action;
		item.message = message;
		item.data = data;
		item.time = (Date.now() - startTime);
		item.group = group;
		// fresh
		Object.freeze(item);

		if (this._trackEnabled) {
			this._items.push(item);
			this.trim();
		}
		if (this._logEnabled) {
			console.log(this.getItemString(item, true));
		}
		return item;
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	trim(all: boolean = false): void {
		if (all) {
			this._items.splice(0, this._items.length);
		}
		else if (this._trackLimit > 0 && this._items.length > this._trackLimit + this._trackPrune) {
			this._items.splice(this._trackLimit, this._items.length - this._trackPrune);
		}
	}

	reset(): void {
		this._startAt = Date.now();
		this._items.splice(0, this._items.length);
	}

	// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	isMuted(action: string): boolean {
		return this._mutePromises.indexOf(action) > -1;
	}

	muteActions(actions: string[]): void {
		actions.forEach((action: string) => {
			if (this._mutePromises.indexOf(action) < 0) {
				this._mutePromises.push(action);
			}
		});
	}

	unmuteActions(actions?: string[]): void {
		if (!actions) {
			this._mutePromises = [];
			return;
		}
		actions.forEach((action: string) => {
			for (var i = this._mutePromises.length - 1; i > -1; i--) {
				if (actions.indexOf(action) > -1) {
					this._mutePromises.splice(i, 1);
				}
			}
		});
	}

	unmuteAll(): void {
		this._mutePromises = [];
	}

	// TODO fix odd NaN default param
	setTrack(enabled: boolean, limit: number = NaN, prune: number = NaN): void {
		this._trackEnabled = enabled;
		this._trackLimit = (isNaN(limit) ? this._trackLimit : limit);
		this._trackPrune = (isNaN(prune) ? this._trackPrune : prune);
	}

	getItemString(item: EventLogItem, multiline: boolean = false): string {
		var msg = '';
		// msg += padL(item.index, 6, '0') + ' ';
		msg += item.action + ' -> ' + item.type;
		// msg += ' ' + (this._label ? +': ' + this._label : '');
		if (typeOf.isValid(item.message) && item.message.length > 0) {
			msg += (multiline ? '\n      ' : ': ') + encode.trimWrap(item.message, 200, true);
		}
		if (typeOf.isValid(item.data)) {
			msg += (multiline ? '\n      ' : ': ') + inspect.toValueStrim(item.data, 4, 200);
		}
		return msg;
	}

	getHistory(): string {
		var memo: string[] = [];
		if (this._label) {
			memo.push(this._label + '(' + this._items.length + ')');
		}
		return this._items.reduce((memo: string[], item: EventLogItem) => {
			memo.push(this.getItemString(item));
			return memo;
		}, memo).join('\n');
	}

	getStats(): StatCounter {
		var ret = new StatCounter();
		this._items.forEach((item: EventLogItem) => {
			ret.count(item.action);
		});
		return ret;
	}

	getItems(): EventLogItem[] {
		return (this._trackLimit > 0 ? this._items.slice(0, this._trackLimit) : this._items.slice(0));
	}

	getReport(label?: string): string {
		return this.getStats().getReport(label);
	}
}

var itemCounter = 0;

export class EventLogItem {
	type: string;
	action: string;

	message: string;
	data: any;
	index: number;
	time: number;

	group: any;

	constructor() {
		this.index = (++itemCounter);
	}

	toString(): string {
		return this.action + ':' + this.type + ' #' + this.index;
	}
}
