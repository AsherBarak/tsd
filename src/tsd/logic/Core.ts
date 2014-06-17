/// <reference path="../_ref.d.ts" />

'use strict';

// TODO get rid of hacky updateConfig()

import path = require('path');
import Promise = require('bluebird');

import collection = require('../../xm/collection');
import assertVar = require('../../xm/assertVar');
import objectUtils = require('../../xm/objectUtils');
import CacheMode = require('../../http/CacheMode');
import eventLog = require('../../xm/lib/eventLog');
import typeOf = require('../../xm/typeOf');

import GithubRepo = require('../../git/GithubRepo');

import Context = require('../context/Context');

import CoreModule = require('./CoreModule');

import IndexManager = require('./IndexManager');
import SelectorQuery = require('./SelectorQuery');
import ConfigIO = require('./ConfigIO');
import ContentLoader = require('./ContentLoader');
import InfoParser = require('./InfoParser');
import Installer = require('./Installer');
import Resolver = require('./Resolver');
import BundleManager = require('./BundleManager');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var leadingExp = /^\.\.\//;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/*
 Core: operational core logics
 */
class Core {

	context: Context;
	repo: GithubRepo;

	index: IndexManager;
	selector: SelectorQuery;
	config: ConfigIO;
	content: ContentLoader;
	parser: InfoParser;
	installer: Installer;
	resolver: Resolver;
	bundle: BundleManager;

	private _components: MultiManager;
	private _cacheMode: string;

	constructor(context: Context) {
		assertVar(context, Context, 'context');
		this.context = context;

		this._components = new MultiManager(this);
		this._components.add([
			this.index = new IndexManager(this),
			this.config = new ConfigIO(this),
			this.selector = new SelectorQuery(this),
			this.content = new ContentLoader(this),
			this.parser = new InfoParser(this),
			this.installer = new Installer(this),
			this.resolver = new Resolver(this),
			this.bundle = new BundleManager(this)
		]);

		this.updateConfig();

		this.verbose = this.context.verbose;
	}

	updateConfig(): void {
		// drop statefull helper
		this._components.replace({
			repo: new GithubRepo(this.context.config, this.context.paths.cacheDir, this.context.settings)
		});

		// lets be gents
		this.repo.api.headers['user-agent'] = this.context.packageInfo.getNameVersion();
		this.repo.raw.headers['user-agent'] = this.context.packageInfo.getNameVersion();

		var token = this.context.settings.getValue('/token');
		if (typeOf.isString(token)) {
			this.repo.api.headers['authorization'] = 'token ' + token;
		}
		else {
			delete this.repo.api.headers['authorization'];
		}

		this.useCacheMode(this._cacheMode);
	}

	useCacheMode(modeName: string): void {
		this._cacheMode = modeName;

		if (modeName in CacheMode) {
			var mode = CacheMode[modeName];
			this.repo.api.cache.opts.cache.applyCacheMode(mode);
			this.repo.raw.cache.opts.cache.applyCacheMode(mode);
		}
	}

	set verbose(verbose: boolean) {
		this._components.verbose = verbose;
	}
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

class MultiManager {

	private _verbose: boolean = false;
	private _modules = new collection.Set<CoreModule>();

	constructor(public core: Core) {
		assertVar(core, Core, 'core');
	}

	add(list: CoreModule[]) {
		list.forEach((comp) => {
			this._modules.add(comp);
		});
	}

	remove(list: CoreModule[]) {
		while (list.length > 0) {
			this._modules.delete(list.pop());
		}
	}

	replace(fields: Object): void {
		Object.keys(fields).forEach((property: string) => {
			this._modules.delete(this.core[property]);
			var trackable = fields[property];
			if (!this.core[property]) {
				this.core[property] = trackable;
			}
			trackable.verbose = this._verbose;
			this._modules.add(fields[property]);
		});
	}

	set verbose(verbose: boolean) {
		this._verbose = verbose;
		this._modules.forEach((comp: CoreModule) => {
			comp.verbose = this._verbose;
		});
	}
}

export = Core;
