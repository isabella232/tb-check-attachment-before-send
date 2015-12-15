/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var CheckAttachmentBeforeSendHelper = {
  BASE: 'extensions.check-attachment-before-send@clear-code.com.',

  get prefs() {
    delete this.prefs;
    var { prefs } = Components.utils.import('resource://check-attachment-before-send-modules/prefs.js', {});
    return this.prefs = prefs;
  },

  get ignoredDomains() {
    if (this._cachekdIgnoredDomains)
      return this._cachekdIgnoredDomains;

    var domains = this.prefs.getPref(this.BASE + 'ignoreDomains') || '';
    if (!domains)
      return this._cachekdIgnoredDomains = [];

    domains = domains.replace(/^[,|]|[,|]$/g, '').split(/\s*[,|]\s*|\s+/);
    return this._cachekdIgnoredDomains = domains.filter(function(aDomain) {
      return aDomain.trim() !== '';
    });
  },

  get confirmationPattern() {
    if (this._cachedConfirmationPattern)
      return this._cachedConfirmationPattern;

    var pattern = this.prefs.getPref(this.BASE + 'confirmationPattern') || '';
    if (!pattern)
      return this._cachedConfirmationPattern = null;

    pattern = pattern.trim();
    return this._cachedConfirmationPattern = new RegExp(pattern, 'i');
  },

  log: function(aMessage, ...aExtraArgs) {
    if (!this.prefs.getPref(this.BASE + 'debug')) {
      return;
    }

    aMessage = aMessage || '';
    aMessage = '[check-attachment-before-send] ' + aMessage;
    aExtraArgs.forEach(function(aArg) {
      aMessage += ', ' + JSON.stringify(aArg);
    });

    ConsoleService = Components.classes['@mozilla.org/consoleservice;1']
                       .getService(Components.interfaces.nsIConsoleService);
	ConsoleService.logStringMessage(aMessage);
  },

  get hasAttachment() {
    var attachmentsBacket = GetMsgAttachmentElement();
    var attachmentsCount = attachmentsBacket.itemCount;
    return attachmentsCount > 0;
  },

  get bodyText() {
    var holderNode = gMsgCompose.editor.document.body ||
                 gMsgCompose.editor.document.documentElement;
    return holderNode.textContent.replace(/\s+/g, '');
  },

  get subject() {
    return document.getElementById('msgSubject').value;
  },

  confirm: function() {
    // clear cache
    delete this._cachekdIgnoredDomains;
    delete this._cachedConfirmationPattern;

    if (!this.hasAttachment) {
      this.log('No attachment.');
      return true;
    }

    if (this.confirmationPattern &&
        !this.confirmationPattern.test(this.bodyText) &&
        !this.confirmationPattern.test(this.subject)) {
      this.log('Not matched to the confirmation pattern.', this.confirmationPattern.source);
      return true;
    }

    var recipients = this.getAllRecipients();
    if (recipients.to.length + recipients.cc.length + recipients.bcc.length === 0) {
      this.log('No external recipient.');
      return true;
    }
    this.log('External recipients are detected: ', recipients);

    return true;
  },

  getAllRecipients: function() {
    var msgCompFields = gMsgCompose.compFields;
    Recipients2CompFields(msgCompFields);
    gMsgCompose.expandMailingLists();

    return {
      to:  this.splitRecipients(msgCompFields.to, 'To'),
      cc:  this.splitRecipients(msgCompFields.cc, 'Cc'),
      bcc: this.splitRecipients(msgCompFields.bcc, 'Bcc')
    };
  },

  splitRecipients: function(aAddressesSource, aType){
    var gMimeHeaderParser = Components.classes['@mozilla.org/messenger/headerparser;1']
                              .getService(Components.interfaces.nsIMsgHeaderParser);
    var addresses = {};
    var names = {};
    var fullNames = {};
    var numAddresses = gMimeHeaderParser.parseHeadersWithArray(
                         aAddressesSource, addresses, names, fullNames);
    var recipients = [];
    for (let i = 0; i < numAddresses; i++) {
      let address = addresses.value[i];
      let domain = address.split('@')[1];
      if (this.ignoredDomains.indexOf(domain) > -1)
        continue;
      recipients.push({
        address:  address,
        name:     names.value[i],
        fullName: fullNames.value[i],
        type:     aType
      });
    }
    return recipients;
  },
};

window.addEventListener('load', function CheckAttachmentBeforeSendOnLoad(aEvent) {
  window.removeEventListener(aEvent.type, CheckAttachmentBeforeSendOnLoad, false);

  window.__checkattachmentbeforesend__SendMessage = window.SendMessage;
  window.SendMessage = function SendMessage(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessage.apply(this, aArgs);
  };

  window.__checkattachmentbeforesend__SendMessageWithCheck = window.SendMessageWithCheck;
  window.SendMessageWithCheck = function SendMessageWithCheck(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessageWithCheck.apply(this, aArgs);
  };

  window.__checkattachmentbeforesend__SendMessageLater = window.SendMessageLater;
  window.SendMessageLater = function SendMessageLater(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessageLater.apply(this, aArgs);
  };
}, false);
