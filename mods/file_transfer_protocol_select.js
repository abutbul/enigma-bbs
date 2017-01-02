/* jslint node: true */
'use strict';

//	enigma-bbs
const MenuModule		= require('../core/menu_module.js').MenuModule;
const Config			= require('../core/config.js').config;
const stringFormat		= require('../core/string_format.js');
const ViewController	= require('../core/view_controller.js').ViewController;

//	deps
const async			= require('async');
const _				= require('lodash');

exports.moduleInfo = {
	name	: 'File transfer protocol selection',
	desc	: 'Select protocol / method for file transfer',
	author	: 'NuSkooler',
};

const MciViewIds = {
	protList	: 1,
};

exports.getModule = class FileTransferProtocolSelectModule extends MenuModule {

	constructor(options) {
		super(options);

		this.config = this.menuConfig.config || {};

		if(options.extraArgs) {
			if(options.extraArgs.direction) {
				this.config.direction = options.extraArgs.direction;
			}
		}

		this.config.direction = this.config.direction || 'send';

		this.loadAvailProtocols();

		this.extraArgs	= options.extraArgs;

		if(_.has(options, 'lastMenuResult.sentFileIds')) {
			this.sentFileIds = options.lastMenuResult.sentFileIds;
		}

		this.fallbackOnly	= options.lastMenuResult ? true : false;

		this.menuMethods = {
			selectProtocol : (formData, extraArgs, cb) => {
				const protocol	= this.protocols[formData.value.protocol];
				const finalExtraArgs = this.extraArgs || {};
				Object.assign(finalExtraArgs, { protocol : protocol.protocol, direction : this.config.direction }, extraArgs );

				const modOpts = {
					extraArgs : finalExtraArgs,
				};

				if('send' === this.config.direction) {
					return this.gotoMenu(this.config.downloadFilesMenu || 'sendFilesToUser', modOpts, cb);
				} else {
					return this.gotoMenu(this.config.uploadFilesMenu || 'recvFilesFromUser', modOpts, cb);
				}				
			},
		};
	}

	getMenuResult() {
		if(this.sentFileIds) {
			return { sentFileIds : this.sentFileIds };
		}
	}

	initSequence() {
		if(this.sentFileIds) {
			//	nothing to do here; move along
			this.prevMenu();
		} else {
			super.initSequence();
		}
	}

	mciReady(mciData, cb) {
		super.mciReady(mciData, err => {
			if(err) {
				return cb(err);
			}

			const self	= this;
			const vc	= self.viewControllers.allViews = new ViewController( { client : self.client } );

			async.series(
				[
					function loadFromConfig(callback) {
						const loadOpts = {
							callingMenu		: self,
							mciMap			: mciData.menu
						};

						return vc.loadFromMenuConfig(loadOpts, callback);
					},
					function populateList(callback) {
						const protListView = vc.getView(MciViewIds.protList);

						const protListFormat 		= self.config.protListFormat || '{name}';
						const protListFocusFormat	= self.config.protListFocusFormat || protListFormat;

						protListView.setItems(self.protocols.map(p => stringFormat(protListFormat, p) ) );
						protListView.setFocusItems(self.protocols.map(p => stringFormat(protListFocusFormat, p) ) );

						protListView.redraw();

						return callback(null); 
					}
				],
				err => {
					return cb(err);
				}
			);
		});
	}

	loadAvailProtocols() {
		this.protocols = _.map(Config.fileTransferProtocols, (protInfo, protocol) => {
			return { 
				protocol	: protocol,
				name		: protInfo.name,
			};
		});

		this.protocols.sort( (a, b) => a.name.localeCompare(b.name) );
	}
};
