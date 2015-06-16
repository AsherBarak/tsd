/// <reference path="../_ref.d.ts" />

'use strict';

import typeOf = require('../../xm/typeOf');

function pad(input: number): string {
	var r = String(input);
	if (r.length === 1) {
		r = '0' + r;
	}
	return r;
}

class GithubRateInfo {

	limit: number = 0;
	remaining: number = 0;
	reset: number;
	resetAt: string = '';
	lastUpdate: number;

	constructor(map?: any) {
		this.readFromRes(map);
	}

	readFromRes(map: any) {
		if (typeOf.isObject(map)) {
			if (map['x-ratelimit-limit']) {
				this.limit = parseInt(map['x-ratelimit-limit'], 10);
			}
			if (map['x-ratelimit-remaining']) {
				this.remaining = parseInt(map['x-ratelimit-remaining'], 10);
			}
			if (map['x-ratelimit-reset']) {
				this.reset = parseInt(map['x-ratelimit-reset'], 10) * 1000;
			}
		}
		this.lastUpdate = Date.now();
		this.resetAt = this.getResetString();
	}

	toString(): string {
		return this.remaining + ' of ' + this.limit + (this.remaining < this.limit ? ' @ ' + this.getResetString() : '');
	}

	getResetString(): string {
		var time = this.getTimeToReset();
		if (time > 0) {
			time = time / 1000;
			var hours = Math.floor(time / 3600);
			time -= (hours * 3600);
			var mins = Math.floor(time / 60);
			var secs = Math.floor(time - (mins * 60));
			return (hours) + ':' + pad(mins) + ':' + pad(secs);
		}
		if (this.limit > 0) {
			return '<limit expired>';
		}
		return '<no known limit>';
	}

	getTimeToReset(): number {
		if (this.reset) {
			return Math.max(0, this.reset - Date.now());
		}
		return 0;
	}

	getMinutesToReset(): number {
		if (this.reset) {
			return Math.floor(this.getTimeToReset() / 1000 / 60);
		}
		return 0;
	}

	isBlocked(): boolean {
		return this.remaining === 0;
	}

	isLimited(): boolean {
		return this.limit > 0 && this.remaining < this.limit;
	}

	hasRemaining(): boolean {
		return this.remaining > 0;
	}
}

export = GithubRateInfo;
