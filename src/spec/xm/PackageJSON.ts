/// <reference path="../../_ref.d.ts" />

'use strict';

import chai = require('chai');
var assert = chai.assert;
import helper = require('../../test/helper');

import PackageJSON = require('../../xm/lib/PackageJSON');

describe('PackageJSON', () => {

	var info: PackageJSON;
	it('is defined as function', () => {
		assert.isFunction(PackageJSON);
	});
	describe('local', () => {
		it('should return instance', () => {
			info = PackageJSON.getLocal();
			assert.isObject(info, 'info');
		});
		it('should have properties', () => {
			info = PackageJSON.getLocal();
			assert.isString(info.name, 'name');
			assert.isString(info.version, 'version');
			assert.isObject(info.raw, 'pkg');
		});
	});
	// more in Context
});
