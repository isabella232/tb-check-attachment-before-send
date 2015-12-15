/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ['CheckAttachmentBeforeSendUtils'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var ConsoleService = Cc['@mozilla.org/consoleservice;1']
                       .getService(Ci.nsIConsoleService);

var CheckAttachmentBeforeSendUtils = {
  BASE: 'extensions.check-attachment-before-send@clear-code.com.',

  get prefs() {
    delete this.prefs;
    var { prefs } = Cu.import('resource://check-attachment-before-send-modules/prefs.js', {});
    return this.prefs = prefs;
  },

  getMyPref: function(aKey) {
    return this.prefs.getPref(this.BASE + aKey);
  },

  log: function(aMessage, ...aExtraArgs) {
    if (!this.getMyPref('debug')) {
      return;
    }

    aMessage = aMessage || '';
    aMessage = '[check-attachment-before-send] ' + aMessage;
    aExtraArgs.forEach(function(aArg) {
      aMessage += ', ' + JSON.stringify(aArg);
    });

	ConsoleService.logStringMessage(aMessage);
  }
};
