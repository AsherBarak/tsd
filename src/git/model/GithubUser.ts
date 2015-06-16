/// <reference path="../_ref.d.ts" />

'use strict';

// single user on Github (with profilem gravatar etc)
class GithubUser {

	id: number;
	login: string;
	avatar_url: string;
	// moar fields?

	toString(): string {
		return (this.login ? this.login : '<no login>') + (this.id ? '[' + this.id + ']' : '<no id>');
	}

	static fromJSON(json: any): GithubUser {
		if (!json) {
			return null;
		}
		var ret = new GithubUser();
		ret.id = parseInt(json.id, 10);
		ret.login = json.login;
		ret.avatar_url = json.avatar_url;
		return ret;
	}
}

export = GithubUser;
